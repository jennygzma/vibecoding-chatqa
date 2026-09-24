/* ── StockPicker AI — frontend logic ─────────────────────────────────────── */

const API = 'http://127.0.0.1:5050/api';
let stockData   = [];
let activeWeights = {};  // weights used for the current render

const SIGNAL_LABELS = {
  momentum:  'Momentum',
  ma:        'MA Signal',
  pe:        'Valuation',
  eps:       'EPS Growth',
  debt:      'Debt/Eq',
  margin:    'Margin',
  rsi_score: 'RSI',
  short:     'Short Interest',
};

// ── localStorage keys ─────────────────────────────────────────────────────
const LS_THEME     = 'sp_theme';
const LS_SCORES    = 'sp_score_history';   // { TICKER: [{ts, score}, ...] }
const LS_PORTFOLIO = 'sp_portfolio';        // { TICKER: sharesCount }
const LS_ALERTS    = 'sp_alerts';           // { id: {id,ticker,type,value,createdAt,fired} }

// ── Alert System constants ─────────────────────────────────────────────────
let _alertPollTimer  = null;
const ALERT_POLL_MS  = 30_000;   // poll every 30 s
const ALERT_SOUND_HZ = 880;      // A5 — soft ping frequency

// ── Theme ─────────────────────────────────────────────────────────────────
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  document.getElementById('theme-toggle').textContent = isLight ? '☀' : '☾';
  localStorage.setItem(LS_THEME, isLight ? 'light' : 'dark');
}

function applyStoredTheme() {
  if (localStorage.getItem(LS_THEME) === 'light') {
    document.body.classList.add('light');
    document.getElementById('theme-toggle').textContent = '☀';
  }
}

// ── Boot ──────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  applyStoredTheme();
  await loadSectors();
  await loadStocks();
  _updateBellBadge();
  _startPollingIfNeeded();
});

// ── Sector dropdown ───────────────────────────────────────────────────────
async function loadSectors() {
  try {
    const res  = await fetch(`${API}/sectors`);
    const data = await res.json();
    const sel  = document.getElementById('sector-select');
    sel.innerHTML = '';
    data.sectors.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s === 'all' ? 'All Sectors' : s;
      sel.appendChild(opt);
    });
  } catch { /* keep default */ }
}

// ── Main data loader ──────────────────────────────────────────────────────
async function loadStocks(force = false) {
  const sector = document.getElementById('sector-select').value;
  const mode   = document.getElementById('mode-select').value;
  const url    = `${API}/top-stocks?sector=${encodeURIComponent(sector)}&mode=${mode}`;

  // Force-bust the backend cache when explicitly requested
  if (force) {
    try { await fetch(`${API}/cache`, { method: 'DELETE' }); } catch (_) {}
  }

  showLoading(true);
  hideBanner();
  setRefreshSpinning(true);

  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    stockData     = data.stocks || [];
    activeWeights = data.weights || {};

    // Show timestamp + cache hit ratio
    const cacheInfo = data.cache;
    const hitRatio  = cacheInfo
      ? `${cacheInfo.hits}H / ${cacheInfo.misses}M`
      : '';
    const ts = data.generated
      ? 'Updated ' + new Date(data.generated).toLocaleTimeString()
        + (hitRatio ? ` · Cache ${hitRatio}` : '')
      : '';
    document.getElementById('last-updated').textContent = ts;

    // Feature 5: persist score history for every fetched ticker
    persistScoreHistory(stockData);

    renderWeightBar(activeWeights, data.mode);
    document.getElementById('cards-grid').innerHTML = '';  // force fresh stagger on new data
    reRender();

    // Feature 6: check alerts after data loads
    checkAlerts(stockData);

    // Feature 4: refresh portfolio panel if open
    if (!document.getElementById('portfolio-panel').classList.contains('hidden')) {
      renderPortfolioPanel();
    }
  } catch (err) {
    showBanner(`⚠️ Could not reach the backend: ${err.message}. Is the Flask server running?`, 'error');
  } finally {
    showLoading(false);
    setRefreshSpinning(false);
  }
}

// ── Weight pill bar ───────────────────────────────────────────────────────
function renderWeightBar(weights, mode) {
  const bar   = document.getElementById('weight-bar');
  const pills = document.getElementById('weight-pills');
  if (!weights || !Object.keys(weights).length) {
    bar.classList.add('hidden');
    return;
  }

  const modeTag  = mode ? ` <span style="color:var(--accent);font-weight:700;">[${mode}]</span>` : '';
  const maxW     = Math.max(...Object.values(weights));

  pills.innerHTML = Object.entries(weights).map(([key, val]) => {
    const pct   = Math.round(val * 100);
    const barW  = Math.round((val / maxW) * 100);
    const label = SIGNAL_LABELS[key] || key;
    return `<span class="weight-pill">
      <span class="weight-pill-name">${label}</span>
      <span class="weight-pill-track"><span class="weight-pill-fill" style="width:${barW}%"></span></span>
      <span class="weight-pill-val">${pct}%</span>
    </span>`;
  }).join('');

  document.querySelector('.weight-bar-label').innerHTML = `🎲 Formula${modeTag}:`;
  bar.classList.remove('hidden');
}

// ── Ticker scramble ───────────────────────────────────────────────────────
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@$%&';

function scrambleTicker(anchorEl, realTicker) {
  const len      = realTicker.length;
  const totalMs  = 1100;          // total duration
  const frameMs  = 45;            // ms per frame
  const frames   = Math.round(totalMs / frameMs);
  // each character resolves after a staggered portion of the total frames
  const resolveAt = realTicker.split('').map((_, i) =>
    Math.round(frames * (0.35 + (i / len) * 0.55))
  );

  let frame = 0;
  const iv = setInterval(() => {
    frame++;
    const display = realTicker.split('').map((ch, i) => {
      if (frame >= resolveAt[i]) return ch;
      return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
    }).join('');

    // Keep the ↗ suffix that's part of the link text
    anchorEl.textContent = display + ' ↗';

    if (frame >= frames) {
      clearInterval(iv);
      anchorEl.textContent = realTicker + ' ↗';
      anchorEl.classList.remove('scrambling');
    }
  }, frameMs);

  anchorEl.classList.add('scrambling');
}

function scrambleRandomCard(grid, sorted) {
  if (!sorted.length) return;
  const pick   = sorted[Math.floor(Math.random() * sorted.length)];
  const card   = grid.querySelector(`[data-ticker="${pick.ticker}"]`);
  if (!card) return;
  const anchor = card.querySelector('.row-ticker-sym');
  if (!anchor) return;
  scrambleTicker(anchor, pick.ticker);
}

// ── Re-render (sort only) ─────────────────────────────────────────────────
function reRender() {
  const sortKey = document.getElementById('sort-select').value;
  const n       = parseInt(document.getElementById('top-n').value, 10);

  const sorted = [...stockData].sort((a, b) => {
    if (sortKey === 'score')    return b.score    - a.score;
    if (sortKey === 'change1d') return b.change1d - a.change1d;
    if (sortKey === 'pe')       return (a.pe ?? 9999) - (b.pe ?? 9999);
    if (sortKey === 'rsi')      return (a.rsi ?? 9999) - (b.rsi ?? 9999);
    return 0;
  }).slice(0, n);

  const grid = document.getElementById('cards-grid');

  // ── First-ever render: build all cards from scratch with stagger ──────────
  if (grid.children.length === 0) {
    sorted.forEach((s, i) => {
      const hue  = Math.round((i / sorted.length) * 360);
      const card = buildCard(s, i + 1, hue);
      card.style.animationDelay = `${i * 55}ms`;
      card.classList.add('card-enter');
      grid.appendChild(card);
    });
    grid.classList.remove('hidden');
    document.getElementById('table-head').classList.remove('hidden');
    requestAnimationFrame(() => sorted.forEach(s => drawSparkline(s)));
    // Scramble a random ticker once the stagger animation settles
    setTimeout(() => scrambleRandomCard(grid, sorted), sorted.length * 55 + 400);
    return;
  }

  // ── Subsequent renders: FLIP animation ────────────────────────────────────

  // Build / remove cards for tickers that entered or left the visible set
  const visibleTickers = new Set(sorted.map(s => s.ticker));
  const existingTickers = new Set(
    [...grid.children].map(el => el.dataset.ticker)
  );

  // Add new cards (hidden offscreen until positioned)
  const newTickers = [...visibleTickers].filter(t => !existingTickers.has(t));
  newTickers.forEach(ticker => {
    const s    = sorted.find(x => x.ticker === ticker);
    const i    = sorted.indexOf(s);
    const hue  = Math.round((i / sorted.length) * 360);
    const card = buildCard(s, i + 1, hue);
    card.style.opacity = '0';
    grid.appendChild(card);
    drawSparkline(s);
  });

  // Remove cards no longer in the visible set
  [...grid.children].forEach(el => {
    if (!visibleTickers.has(el.dataset.ticker)) el.remove();
  });

  // Update rank labels and hues for every card
  sorted.forEach((s, i) => {
    const card = grid.querySelector(`[data-ticker="${s.ticker}"]`);
    if (!card) return;
    const hue = Math.round((i / sorted.length) * 360);
    card.style.setProperty('--card-hue', hue);
    const medals    = ['🥇','🥈','🥉'];
    const rankLabel = (i + 1) <= 3 ? medals[i] : `#${i + 1}`;
    const rankEl    = card.querySelector('.row-rank');
    if (rankEl) {
      rankEl.textContent = rankLabel;
      rankEl.className   = `row-rank${(i + 1) <= 3 ? ' top3' : ''}`;
    }
  });

  // ── FLIP: record positions BEFORE reorder ──────────────────────────────────
  const first = {};
  [...grid.children].forEach(el => {
    first[el.dataset.ticker] = el.getBoundingClientRect().top;
  });

  // ── Reorder DOM nodes to match new sort ───────────────────────────────────
  sorted.forEach(s => {
    const card = grid.querySelector(`[data-ticker="${s.ticker}"]`);
    if (card) grid.appendChild(card);   // moves to end; sorted order is preserved
  });

  // ── FLIP: compute delta and animate each card ─────────────────────────────
  sorted.forEach((s, i) => {
    const card = grid.querySelector(`[data-ticker="${s.ticker}"]`);
    if (!card) return;

    const isNew = newTickers.includes(s.ticker);
    if (isNew) {
      // New cards fade + slide in
      card.style.transition = 'none';
      card.style.transform  = 'translateX(24px)';
      card.style.opacity    = '0';
      requestAnimationFrame(() => {
        card.style.transition = 'transform 0.38s cubic-bezier(0.22,0.61,0.36,1), opacity 0.3s ease';
        card.style.transform  = '';
        card.style.opacity    = '';
      });
      return;
    }

    const last  = card.getBoundingClientRect().top;
    const delta = first[s.ticker] - last;

    if (Math.abs(delta) < 1) return;  // already in place — skip

    // Snap card back to where it was (visually), then animate to final spot
    card.style.transition = 'none';
    card.style.transform  = `translateY(${delta}px)`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.transition = 'transform 0.42s cubic-bezier(0.22,0.61,0.36,1)';
        card.style.transform  = '';
      });
    });
  });

  // Scramble a random ticker after the FLIP moves settle
  setTimeout(() => scrambleRandomCard(grid, sorted), 500);
}

// ── Build a compact table-row card ───────────────────────────────────────
function buildCard(s, rank, hue) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.ticker = s.ticker;
  if (hue !== undefined) card.style.setProperty('--card-hue', hue);
  card.addEventListener('click', () => {
    if (Math.random() < 0.5) {
      openModal(s);
    } else {
      rejectClick(card, s.ticker);
    }
  });

  const scoreClass = s.score >= 72 ? 'high' : s.score >= 55 ? 'medium' : 'low';
  const chgClass   = s.change1d > 0 ? 'pos' : s.change1d < 0 ? 'neg' : 'neu';
  const chgSign    = s.change1d > 0 ? '+' : '';
  const medals     = ['🥇','🥈','🥉'];
  const rankLabel  = rank <= 3 ? medals[rank - 1] : `#${rank}`;

  card.innerHTML = `
    <div class="row-rank ${rank<=3?'top3':''}">${rankLabel}</div>
    <div class="row-spark"><canvas id="spark-${s.ticker}"></canvas></div>
    <div class="row-ticker">
      <a class="row-ticker-sym yf-link" href="https://finance.yahoo.com/quote/${s.ticker}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${s.ticker} ↗</a>
      <span class="row-ticker-name">${s.name}</span>
    </div>
    <div class="row-price">$${s.currentPrice.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
    <div class="row-chg"><span class="chg ${chgClass}">${chgSign}${s.change1d.toFixed(2)}%</span></div>
    <div class="row-score"><span class="score-val ${scoreClass}">${s.score}</span></div>
    <div class="row-pe">${s.pe ?? '—'}</div>
    <div class="row-rsi">${s.rsi}</div>
    <div class="row-eps">${s.epsGrowth != null ? s.epsGrowth + '%' : '—'}</div>
    <div class="row-margin">${s.profitMargin != null ? s.profitMargin + '%' : '—'}</div>
    <div class="row-cap">${formatMktCap(s.marketCap)}</div>`;

  return card;
}

// ── Sparkline (pure canvas, compact 36 px tall) ───────────────────────────
function drawSparkline(s) {
  const canvas = document.getElementById(`spark-${s.ticker}`);
  if (!canvas || !s.sparkline || s.sparkline.length < 2) return;

  const dpr = window.devicePixelRatio || 1;
  const w   = canvas.parentElement.clientWidth - 8; // subtract padding
  const h   = 36;
  canvas.width  = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const prices = s.sparkline;
  const min    = Math.min(...prices);
  const max    = Math.max(...prices);
  const range  = max - min || 1;
  const pad    = 2;
  const xFn    = i => (i / (prices.length - 1)) * (w - pad * 2) + pad;
  const yFn    = v => h - pad - ((v - min) / range) * (h - pad * 2);

  const isUp = prices[prices.length - 1] >= prices[0];
  const col  = isUp ? '63,185,80' : '248,81,73';
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `rgba(${col},.25)`);
  grad.addColorStop(1, `rgba(${col},0)`);

  // filled area
  ctx.beginPath();
  ctx.moveTo(xFn(0), yFn(prices[0]));
  prices.forEach((p, i) => { if (i > 0) ctx.lineTo(xFn(i), yFn(p)); });
  ctx.lineTo(xFn(prices.length - 1), h);
  ctx.lineTo(xFn(0), h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // line
  ctx.beginPath();
  ctx.moveTo(xFn(0), yFn(prices[0]));
  prices.forEach((p, i) => { if (i > 0) ctx.lineTo(xFn(i), yFn(p)); });
  ctx.strokeStyle = `rgb(${col})`;
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';
  ctx.stroke();
}

// ── Modal ─────────────────────────────────────────────────────────────────
function openModal(s) {
  const scoreClass = s.score >= 72 ? 'high' : s.score >= 55 ? 'medium' : 'low';

  const subBars = Object.entries(s.subScores).map(([k, v]) => {
    const wPct  = activeWeights[k] != null ? Math.round(activeWeights[k] * 100) : null;
    const wTag  = wPct != null
      ? `<span class="subscore-weight" title="Signal weight in this formula run">×${wPct}%</span>`
      : '';
    return `
    <div class="subscore-bar-wrap">
      <span class="subscore-label">${SIGNAL_LABELS[k]||k}${wTag}</span>
      <div class="subscore-track"><div class="subscore-fill" style="width:${v}%"></div></div>
      <span class="subscore-val">${v}</span>
    </div>`;
  }).join('');

  const rationale = s.rationale.map(r => `<div class="rationale-item" style="margin-bottom:6px;">${r}</div>`).join('');

  // Feature 5: score history chart placeholder
  const scoreHistorySection = `
    <div class="modal-section">
      <h4>AI Score History</h4>
      <canvas id="score-history-canvas" class="score-history-canvas"></canvas>
      <div id="score-history-empty" class="score-history-empty hidden">Not enough data yet — refresh a few times to build history.</div>
    </div>`;

  // Feature 6: alert settings for this ticker
  const alerts = loadAlerts();
  const tickerAlert = alerts[s.ticker] || {};
  const alertSection = `
    <div class="modal-section">
      <h4>🔔 Set Alert</h4>
      <div class="alert-inputs">
        <label class="alert-label">Target Price ($)
          <input type="number" id="alert-price-input" class="alert-input" min="0" step="0.01"
            placeholder="e.g. 200" value="${tickerAlert.price ?? ''}" />
        </label>
        <label class="alert-label">Score Threshold
          <input type="number" id="alert-score-input" class="alert-input" min="0" max="100" step="1"
            placeholder="e.g. 75" value="${tickerAlert.score ?? ''}" />
        </label>
        <button class="btn btn-secondary" onclick="saveAlertFromModal('${s.ticker}')">Save Alert</button>
        <button class="btn btn-theme" onclick="clearAlertFromModal('${s.ticker}')">Clear</button>
      </div>
    </div>`;

  document.getElementById('modal-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
      <div class="ticker-circle" style="width:52px;height:52px;font-size:1rem;">${s.ticker}</div>
      <div>
        <h2>${s.ticker} &nbsp;<span class="score-ring ${scoreClass}" style="display:inline-flex;width:42px;height:42px;font-size:.95rem;vertical-align:middle;">${s.score}</span></h2>
        <div class="modal-sub">${s.name} &nbsp;·&nbsp; ${s.sector}</div>
        <a class="yf-link modal-yf-link" href="https://finance.yahoo.com/quote/${s.ticker}" target="_blank" rel="noopener">View on Yahoo Finance ↗</a>
      </div>
    </div>
    <div class="modal-section">
      <h4>AI Score Breakdown</h4>${subBars}
    </div>
    ${scoreHistorySection}
    <div class="modal-section">
      <h4>Why Buy?</h4>${rationale}
    </div>
    <div class="modal-section">
      <h4>Key Metrics</h4>
      <div class="metrics-grid" style="grid-template-columns:1fr 1fr 1fr;">
        <div class="metric"><span class="metric-label">Price</span><span class="metric-value">$${s.currentPrice.toLocaleString()}</span></div>
        <div class="metric"><span class="metric-label">P/E</span><span class="metric-value">${s.pe??'—'}</span></div>
        <div class="metric"><span class="metric-label">RSI</span><span class="metric-value">${s.rsi}</span></div>
        <div class="metric"><span class="metric-label">EPS Gr.</span><span class="metric-value">${s.epsGrowth!=null?s.epsGrowth+'%':'—'}</span></div>
        <div class="metric"><span class="metric-label">Margin</span><span class="metric-value">${s.profitMargin!=null?s.profitMargin+'%':'—'}</span></div>
        <div class="metric"><span class="metric-label">D/E</span><span class="metric-value">${s.debtToEquity??'—'}</span></div>
        <div class="metric"><span class="metric-label">Div Yld</span><span class="metric-value">${s.dividendYield>0?s.dividendYield+'%':'—'}</span></div>
        <div class="metric"><span class="metric-label">Mkt Cap</span><span class="metric-value">${formatMktCap(s.marketCap)}</span></div>
        <div class="metric"><span class="metric-label">52W Pos</span><span class="metric-value">${s.week52RangePct}%</span></div>
        <div class="metric"><span class="metric-label">Short Int.</span><span class="metric-value">${s.shortInterest != null ? s.shortInterest + '%' : '—'}</span></div>
      </div>
    </div>
    ${alertSection}`;

  document.getElementById('modal-overlay').classList.remove('hidden');

  // Feature 5: draw the score history chart after DOM is ready
  requestAnimationFrame(() => drawScoreHistoryChart(s.ticker));
}

function closeModal(evt) {
  if (evt && evt.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ── Utilities ─────────────────────────────────────────────────────────────
function formatMktCap(cap) {
  if (!cap) return '—';
  if (cap >= 1e12) return `$${(cap/1e12).toFixed(1)}T`;
  if (cap >= 1e9)  return `$${(cap/1e9).toFixed(1)}B`;
  if (cap >= 1e6)  return `$${(cap/1e6).toFixed(1)}M`;
  return `$${cap}`;
}

function showLoading(on) {
  document.getElementById('loading').classList.toggle('hidden', !on);
  if (on) {
    document.getElementById('cards-grid').classList.add('hidden');
    document.getElementById('table-head').classList.add('hidden');
  }
}

function showBanner(msg, type = 'error') {
  const b = document.getElementById('status-banner');
  b.textContent = msg;
  b.className   = `status-banner ${type}`;
}

function hideBanner() {
  document.getElementById('status-banner').className = 'status-banner hidden';
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 5 — Historical AI Score chart
// ══════════════════════════════════════════════════════════════════════════════

/** Save the current score for each ticker with a UTC timestamp. */
function persistScoreHistory(stocks) {
  let history = {};
  try { history = JSON.parse(localStorage.getItem(LS_SCORES) || '{}'); } catch {}
  const ts = Date.now();
  stocks.forEach(s => {
    if (!history[s.ticker]) history[s.ticker] = [];
    // Only append if the last entry was > 5 minutes ago (avoid duplicates on rapid refresh)
    const last = history[s.ticker].at(-1);
    if (!last || ts - last.ts > 5 * 60 * 1000) {
      history[s.ticker].push({ ts, score: s.score });
    }
    // Keep only the last 60 data points per ticker
    if (history[s.ticker].length > 60) history[s.ticker] = history[s.ticker].slice(-60);
  });
  try { localStorage.setItem(LS_SCORES, JSON.stringify(history)); } catch {}
}

/** Draw a compact line chart of score-over-time onto #score-history-canvas. */
function drawScoreHistoryChart(ticker) {
  let history = {};
  try { history = JSON.parse(localStorage.getItem(LS_SCORES) || '{}'); } catch {}
  const points = history[ticker] || [];

  const canvas  = document.getElementById('score-history-canvas');
  const emptyEl = document.getElementById('score-history-empty');
  if (!canvas) return;

  if (points.length < 2) {
    canvas.style.display = 'none';
    emptyEl && emptyEl.classList.remove('hidden');
    return;
  }
  emptyEl && emptyEl.classList.add('hidden');
  canvas.style.display = 'block';

  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.parentElement.clientWidth || 400;
  const H   = 80;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const scores = points.map(p => p.score);
  const minS   = Math.min(...scores);
  const maxS   = Math.max(...scores);
  const range  = Math.max(maxS - minS, 5);
  const pad    = { t: 6, b: 18, l: 6, r: 6 };
  const iW     = W - pad.l - pad.r;
  const iH     = H - pad.t - pad.b;

  const xFn = i => pad.l + (i / (points.length - 1)) * iW;
  const yFn = v => pad.t + iH - ((v - minS) / range) * iH;

  ctx.fillStyle = '#21262d';
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + iH);
  grad.addColorStop(0, 'rgba(88,166,255,0.35)');
  grad.addColorStop(1, 'rgba(88,166,255,0.02)');
  ctx.beginPath();
  ctx.moveTo(xFn(0), yFn(scores[0]));
  scores.forEach((v, i) => { if (i > 0) ctx.lineTo(xFn(i), yFn(v)); });
  ctx.lineTo(xFn(scores.length - 1), pad.t + iH);
  ctx.lineTo(xFn(0), pad.t + iH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(xFn(0), yFn(scores[0]));
  scores.forEach((v, i) => { if (i > 0) ctx.lineTo(xFn(i), yFn(v)); });
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth   = 2;
  ctx.lineJoin    = 'round';
  ctx.stroke();

  const special = new Set([0, scores.length - 1,
    scores.indexOf(Math.min(...scores)), scores.indexOf(Math.max(...scores))]);
  ctx.textAlign = 'center';
  special.forEach(i => {
    const x = xFn(i), y = yFn(scores[i]);
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#58a6ff';
    ctx.fill();
    const labelY = y < pad.t + 12 ? y + 12 : y - 5;
    ctx.fillStyle = '#8b949e';
    ctx.font = '9px sans-serif';
    ctx.fillText(scores[i], x, labelY);
  });

  ctx.fillStyle = '#8b949e';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(fmtDate(points[0].ts), pad.l, H - 4);
  ctx.textAlign = 'right';
  ctx.fillText(fmtDate(points.at(-1).ts), W - pad.r, H - 4);
}

function fmtDate(ts) {
  const d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 4 — Portfolio Tracker
// ══════════════════════════════════════════════════════════════════════════════

function loadPortfolio() {
  try { return JSON.parse(localStorage.getItem(LS_PORTFOLIO) || '{}'); } catch { return {}; }
}

function savePortfolio(data) {
  try { localStorage.setItem(LS_PORTFOLIO, JSON.stringify(data)); } catch {}
}

function togglePortfolio() {
  const panel = document.getElementById('portfolio-panel');
  const hidden = panel.classList.toggle('hidden');
  if (!hidden) renderPortfolioPanel();
}

function renderPortfolioPanel() {
  const portfolio = loadPortfolio();
  const rowsEl    = document.getElementById('portfolio-rows');

  if (stockData.length === 0) {
    rowsEl.innerHTML = '<p style="color:var(--muted);font-size:.8rem;">Load stocks first to populate your portfolio.</p>';
    return;
  }

  rowsEl.innerHTML = '';
  stockData.forEach(s => {
    const shares = portfolio[s.ticker] ?? '';
    const row = document.createElement('div');
    row.className = 'port-row';
    row.innerHTML = `
      <span class="port-row-ticker">${s.ticker}</span>
      <span class="port-row-name">${s.name}</span>
      <span class="port-row-price">$${s.currentPrice.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
      <input type="number" class="port-shares-input" min="0" step="1" placeholder="shares"
        value="${shares}" data-ticker="${s.ticker}" />
      <span class="port-row-value" id="port-val-${s.ticker}">
        ${shares ? '$' + (shares * s.currentPrice).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}
      </span>`;
    rowsEl.appendChild(row);

    const input = row.querySelector('.port-shares-input');
    input.addEventListener('input', () => {
      const v  = parseFloat(input.value) || 0;
      const pf = loadPortfolio();
      if (v > 0) pf[s.ticker] = v; else delete pf[s.ticker];
      savePortfolio(pf);
      document.getElementById(`port-val-${s.ticker}`).textContent =
        v > 0 ? '$' + (v * s.currentPrice).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
      updatePortfolioSummary();
    });
  });

  updatePortfolioSummary();
}

function updatePortfolioSummary() {
  const portfolio = loadPortfolio();
  const summaryEl = document.getElementById('portfolio-summary');
  const held      = stockData.filter(s => portfolio[s.ticker] > 0);

  if (held.length === 0) { summaryEl.classList.add('hidden'); return; }
  summaryEl.classList.remove('hidden');

  let totalValue = 0, totalDayPnl = 0, weightedScore = 0;
  held.forEach(s => {
    const shares    = portfolio[s.ticker];
    const val       = shares * s.currentPrice;
    const prevPrice = s.currentPrice / (1 + s.change1d / 100);
    totalValue    += val;
    totalDayPnl   += shares * (s.currentPrice - prevPrice);
    weightedScore += s.score * val;
  });

  const avgScore = totalValue > 0 ? (weightedScore / totalValue).toFixed(1) : '—';
  const pnlSign  = totalDayPnl >= 0 ? '+' : '';
  const pnlClass = totalDayPnl >= 0 ? 'pos' : 'neg';

  document.getElementById('port-total-value').textContent =
    '$' + totalValue.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('port-daily-pnl').innerHTML =
    `<span class="chg ${pnlClass}">${pnlSign}$${Math.abs(totalDayPnl).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>`;
  document.getElementById('port-avg-score').textContent = avgScore;
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 6 — Alerts / Price Targets
// ══════════════════════════════════════════════════════════════════════════════

function loadAlerts() {
  try { return JSON.parse(localStorage.getItem(LS_ALERTS) || '{}'); } catch { return {}; }
}

function saveAlerts(data) {
  try { localStorage.setItem(LS_ALERTS, JSON.stringify(data)); } catch {}
}

function saveAlertFromModal(ticker) {
  const priceVal = parseFloat(document.getElementById('alert-price-input').value);
  const scoreVal = parseFloat(document.getElementById('alert-score-input').value);
  const alerts   = loadAlerts();
  alerts[ticker] = {};
  if (!isNaN(priceVal) && priceVal > 0) alerts[ticker].price = priceVal;
  if (!isNaN(scoreVal) && scoreVal > 0) alerts[ticker].score = scoreVal;
  if (Object.keys(alerts[ticker]).length === 0) delete alerts[ticker];
  saveAlerts(alerts);
  showBanner(`✅ Alert saved for ${ticker}`, 'success');
  setTimeout(hideBanner, 2500);
}

function clearAlertFromModal(ticker) {
  const alerts = loadAlerts();
  delete alerts[ticker];
  saveAlerts(alerts);
  document.getElementById('alert-price-input').value = '';
  document.getElementById('alert-score-input').value = '';
  showBanner(`🗑️ Alert cleared for ${ticker}`, 'success');
  setTimeout(hideBanner, 2000);
}

/** Compare current data against saved alerts and flash the alert banner. */
function checkAlerts(stocks) {
  const alerts   = loadAlerts();
  const triggers = [];

  stocks.forEach(s => {
    const a = alerts[s.ticker];
    if (!a) return;
    if (a.price != null && s.currentPrice >= a.price) {
      triggers.push(`${s.ticker} hit your price target of $${a.price} (now $${s.currentPrice})`);
    }
    if (a.score != null && s.score >= a.score) {
      triggers.push(`${s.ticker} reached score threshold ${a.score} (now ${s.score})`);
    }
  });

  const banner = document.getElementById('alert-banner');
  if (triggers.length === 0) { banner.classList.add('hidden'); return; }

  banner.innerHTML = `🔔 <strong>Alert${triggers.length > 1 ? 's' : ''}:</strong> ` +
    triggers.map(t => `<span class="alert-item">${t}</span>`).join(' &nbsp;|&nbsp; ') +
    ` <button class="btn btn-theme" style="margin-left:12px;height:22px;font-size:.72rem;"
        onclick="document.getElementById('alert-banner').classList.add('hidden')">✕</button>`;
  banner.classList.remove('hidden');
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE 7 — Custom Ticker Lookup
// ══════════════════════════════════════════════════════════════════════════════

async function lookupCustomTicker() {
  const input  = document.getElementById('custom-ticker-input');
  const ticker = (input.value || '').trim().toUpperCase();
  if (!ticker) return;

  showBanner(`⏳ Fetching ${ticker}…`, 'info');

  try {
    const mode = document.getElementById('mode-select').value;
    const res  = await fetch(`${API}/stock/${encodeURIComponent(ticker)}?mode=${mode}`);
    if (!res.ok) throw new Error(`${ticker} not found or could not be scored (HTTP ${res.status})`);
    const s = await res.json();
    if (s.error) throw new Error(s.error);

    hideBanner();
    persistScoreHistory([s]);
    checkAlerts([s]);
    openModal(s);
    input.value = '';
  } catch (err) {
    showBanner(`⚠️ ${err.message}`, 'error');
  }
}

// Allow pressing Enter in the custom ticker input field
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('custom-ticker-input');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') lookupCustomTicker(); });
});

// ── Random Ticker ─────────────────────────────────────────────────────────
// Picks a random ticker from the currently loaded stock list and scores it.
const FALLBACK_TICKERS = [
  'AAPL','MSFT','GOOGL','AMZN','META','NVDA','TSLA','JPM','V','UNH',
  'HD','PG','MA','XOM','BAC','PFE','DIS','NFLX','ADBE','CRM',
  'INTC','AMD','QCOM','PYPL','SBUX','NKE','MCD','KO','PEP','WMT'
];

// ── Floating button physics ────────────────────────────────────────────────
let _floatX = 0, _floatY = 0;       // current position (px)
let _floatVX = 2.2, _floatVY = 1.7; // velocity (px per frame)
let _floatAngle = 0;                 // current rotation (deg)
let _floatSpin  = 1.8;               // rotation speed (deg per frame)
let _floatT     = 0;                 // time counter for opacity sine wave
let _floatRafId  = null;
let _floatPaused = false;

function _floatLoop() {
  const btn = document.getElementById('random-ticker-btn');
  if (!btn) return;

  if (!_floatPaused) {
    const bw = btn.offsetWidth  || 90;
    const bh = btn.offsetHeight || 26;
    const maxX = window.innerWidth  - bw;
    const maxY = window.innerHeight - bh;

    _floatX += _floatVX;
    _floatY += _floatVY;

    // Bounce off edges
    if (_floatX <= 0)    { _floatX = 0;    _floatVX = Math.abs(_floatVX); }
    if (_floatX >= maxX) { _floatX = maxX; _floatVX = -Math.abs(_floatVX); }
    if (_floatY <= 0)    { _floatY = 0;    _floatVY = Math.abs(_floatVY); }
    if (_floatY >= maxY) { _floatY = maxY; _floatVY = -Math.abs(_floatVY); }

    _floatAngle += _floatSpin;
    _floatT     += 0.025;  // sine wave speed — lower = slower fade

    const opacity = 0.3 + 0.7 * (Math.sin(_floatT) * 0.5 + 0.5);

    btn.style.left      = _floatX + 'px';
    btn.style.top       = _floatY + 'px';
    btn.style.transform = `rotate(${_floatAngle}deg)`;
    btn.style.opacity   = opacity;
  }

  _floatRafId = requestAnimationFrame(_floatLoop);
}

// Randomly pause for 0.8–2.5 s, then resume in a new direction; repeats every 4–10 s
function _scheduleNextPause() {
  const delay    = 4000 + Math.random() * 6000;   // wait 4–10 s before pausing
  const duration = 800  + Math.random() * 1700;   // stay paused 0.8–2.5 s
  setTimeout(() => {
    _floatPaused = true;
    setTimeout(() => {
      // Pick a fresh random direction at the same speed

      const angle = Math.random() * 2 * Math.PI;
      const speed = 2.5;
      _floatVX = Math.cos(angle) * speed;
      _floatVY = Math.sin(angle) * speed;
      // Pick a new random spin speed (1–3 deg/frame, random direction)
      _floatSpin = (1 + Math.random() * 2) * (Math.random() < 0.5 ? 1 : -1);
      _floatPaused = false;
      _scheduleNextPause();
    }, duration);
  }, delay);
}

function startFloatingBtn() {
  const btn = document.getElementById('random-ticker-btn');
  if (!btn) return;
  // Random starting position
  _floatX = Math.random() * (window.innerWidth  - (btn.offsetWidth  || 90));
  _floatY = Math.random() * (window.innerHeight - (btn.offsetHeight || 26));
  // Random direction, consistent speed
  const angle = Math.random() * 2 * Math.PI;
  const speed = 2.5;
  _floatVX = Math.cos(angle) * speed;
  _floatVY = Math.sin(angle) * speed;
  _floatRafId = requestAnimationFrame(_floatLoop);
  _scheduleNextPause();
}

function randomTicker() {
  const pool = stockData.length > 0
    ? stockData.map(s => s.ticker)

    : FALLBACK_TICKERS;
  const ticker = pool[Math.floor(Math.random() * pool.length)];
  const input  = document.getElementById('custom-ticker-input');
  input.value  = ticker;
  lookupCustomTicker();
}

// Kick off the float loop once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  startFloatingBtn();
});

// ── Alerts modal helper ───────────────────────────────────────────────────
function closeAlertsModal(evt) {
  if (evt && evt.target !== document.getElementById('alerts-modal-overlay')) return;
  document.getElementById('alerts-modal-overlay').classList.add('hidden');
}





// ══════════════════════════════════════════════════════════════════════════════
// RECOMMENDATIONS TAB
// ══════════════════════════════════════════════════════════════════════════════

let _activePortfolioTab = 'holdings';

function switchPortfolioTab(tab) {
  _activePortfolioTab = tab;
  document.getElementById('port-body-holdings').classList.toggle('hidden', tab !== 'holdings');
  document.getElementById('port-body-recommendations').classList.toggle('hidden', tab !== 'recommendations');
  document.getElementById('tab-holdings').classList.toggle('active', tab === 'holdings');
  document.getElementById('tab-recommendations').classList.toggle('active', tab === 'recommendations');
}



async function generateRecommendations() {
  const portfolio = loadPortfolio();
  const held      = stockData.filter(s => (portfolio[s.ticker] || 0) > 0);

    // PROBE_940_JS

  const content  = document.getElementById('rec-content');
  const loading  = document.getElementById('rec-loading');
  const btn      = document.getElementById('rec-generate-btn');

  if (held.length === 0) {

    content.innerHTML = `<div class="rec-empty">
      📭 No holdings yet.<br>
      <span style="font-size:.72rem;">Switch to the <strong>Holdings</strong> tab, enter your share counts, then come back here.</span>
    </div>`;
    return;
  }

  // Build payload
  const holdings = held.map(s => ({
    ticker:       s.ticker,
    shares:       portfolio[s.ticker],
    score:        s.score,
    currentPrice: s.currentPrice,
    rsi:          s.rsi,
    sector:       s.sector,
    subScores:    s.subScores,
    pe:           s.pe,
    epsGrowth:    s.epsGrowth,
    profitMargin: s.profitMargin,
    debtToEquity: s.debtToEquity,
  }));

  content.innerHTML = '';
  loading.classList.remove('hidden');
  btn.disabled = true;

  try {
    const res  = await fetch(`${API}/recommend`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ holdings }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    renderRecommendations(data);
  } catch (err) {
    content.innerHTML = `<div class="rec-empty" style="color:var(--red);">⚠️ ${err.message}</div>`;
  } finally {
    loading.classList.add('hidden');
    btn.disabled = false;
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// FEATURE: Price & Score Alert Notifications
// ═══════════════════════════════════════════════════════════════════════════

// ── Audio ping via Web Audio API ──────────────────────────────────────────
function _playAlertPing() {
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Annoying alarm: 4 rapid sawtooth chirps with a descending screech
    // Each chirp: harsh saw + LFO tremolo + pitch slide downward
    const CHIRPS      = 4;
    const CHIRP_GAP   = 0.13;   // seconds between chirp starts
    const CHIRP_LEN   = 0.10;   // seconds each chirp lasts

    for (let i = 0; i < CHIRPS; i++) {
      const t0 = ctx.currentTime + i * CHIRP_GAP;

      // ── Oscillator 1: harsh sawtooth ──────────────────────────────────
      const osc1  = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, t0);
      osc1.frequency.linearRampToValueAtTime(660, t0 + CHIRP_LEN); // pitch slides down
      gain1.gain.setValueAtTime(0.35, t0);
      gain1.gain.exponentialRampToValueAtTime(0.001, t0 + CHIRP_LEN);
      osc1.start(t0);
      osc1.stop(t0 + CHIRP_LEN);

      // ── Oscillator 2: slightly detuned square for extra harshness ─────
      const osc2  = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(893, t0);          // 13 Hz detune → beating
      osc2.frequency.linearRampToValueAtTime(671, t0 + CHIRP_LEN);
      gain2.gain.setValueAtTime(0.18, t0);
      gain2.gain.exponentialRampToValueAtTime(0.001, t0 + CHIRP_LEN);
      osc2.start(t0);
      osc2.stop(t0 + CHIRP_LEN);

      // ── LFO tremolo (20 Hz) applied to gain1 for a rattling effect ────
      const lfo      = ctx.createOscillator();
      const lfoGain  = ctx.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(gain1.gain);
      lfo.type = 'square';
      lfo.frequency.setValueAtTime(20, t0);
      lfoGain.gain.setValueAtTime(0.20, t0);
      lfo.start(t0);
      lfo.stop(t0 + CHIRP_LEN);
    }

    // ── Tail: one long descending screech ─────────────────────────────────
    const tTail  = ctx.currentTime + CHIRPS * CHIRP_GAP;
    const osc3   = ctx.createOscillator();
    const gain3  = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(1100, tTail);
    osc3.frequency.exponentialRampToValueAtTime(220, tTail + 0.45);
    gain3.gain.setValueAtTime(0.28, tTail);
    gain3.gain.exponentialRampToValueAtTime(0.001, tTail + 0.45);
    osc3.start(tTail);
    osc3.stop(tTail + 0.45);

  } catch (_) { /* blocked without user gesture — skip silently */ }

  // Show the mute-chase button so the user can stop it
  _showMuteChase(ctx || null);
}

// ── Mute-chase game ───────────────────────────────────────────────────────
// A floating "🔕 Mute Alarm" button that teleports and fades in/out.
// The user must click it within 20 seconds or the page explodes.

let _muteChaseRafId        = null;
let _muteChaseTeleportId   = null;
let _muteChaseCountdownId  = null;
let _muteChaseDeadlineId   = null;
let _muteChaseFadeT        = 0;      // drives the opacity sine wave
let _muteChaseMuted        = false;  // set true on click so explosion knows to abort

function _showMuteChase(audioCtx) {
  _hideMuteChase();
  _muteChaseMuted = false;

  // ── Build overlay + label + countdown ─────────────────────────────────
  const overlay = document.createElement('div');
  overlay.id = 'mute-chase-overlay';

  const label = document.createElement('div');
  label.id = 'mute-chase-label';
  label.innerHTML = '🔔 Alert fired! Catch the button to mute the alarm! <span id="mute-chase-countdown">⏱ 20s</span>';
  overlay.appendChild(label);

  // ── Build the mute button ──────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id          = 'mute-chase-btn';
  btn.textContent = '🔕 Mute Alarm';
  overlay.appendChild(btn);
  document.body.appendChild(overlay);

  _muteChaseRandomPos(btn);

  // ── Fade loop (rAF) — smooth opacity sine wave ─────────────────────────
  _muteChaseFadeT = Math.random() * Math.PI * 2;
  function fadeLoop() {
    _muteChaseFadeT += 0.035;
    const opacity = 0.25 + 0.75 * (Math.sin(_muteChaseFadeT) * 0.5 + 0.5);
    btn.style.opacity = opacity.toFixed(3);
    _muteChaseRafId = requestAnimationFrame(fadeLoop);
  }
  _muteChaseRafId = requestAnimationFrame(fadeLoop);

  // ── Teleport loop — accelerates as time runs out ───────────────────────
  const START_MS = Date.now();
  const LIMIT_MS = 20_000;

  function scheduleTeleport() {
    const elapsed  = Date.now() - START_MS;
    const frac     = Math.min(elapsed / LIMIT_MS, 1);   // 0→1 over 20 s
    // Interval shrinks 900 ms → 150 ms as deadline approaches
    const interval = 900 - frac * 750;
    const delay    = Math.max(80, interval - interval * 0.4 * Math.random());
    _muteChaseTeleportId = setTimeout(() => {
      _muteChaseRandomPos(btn);
      scheduleTeleport();
    }, delay);
  }
  scheduleTeleport();

  // ── Countdown ticker (every 1 s) ──────────────────────────────────────
  let secsLeft = 20;
  function tickCountdown() {
    secsLeft--;
    const cdEl = document.getElementById('mute-chase-countdown');
    if (cdEl) {
      cdEl.textContent = `⏱ ${secsLeft}s`;
      cdEl.className   = secsLeft <= 5 ? 'panic' : secsLeft <= 10 ? 'warn' : '';
    }
    if (secsLeft > 0) _muteChaseCountdownId = setTimeout(tickCountdown, 1000);
  }
  _muteChaseCountdownId = setTimeout(tickCountdown, 1000);

  // ── 20-second deadline ────────────────────────────────────────────────
  _muteChaseDeadlineId = setTimeout(() => {
    if (!_muteChaseMuted) _explodePage(audioCtx);
  }, LIMIT_MS);

  // ── Click handler — mute and dismiss ──────────────────────────────────
  btn.addEventListener('click', () => {
    _muteChaseMuted = true;
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
    _hideMuteChase();
  });
}

function _muteChaseRandomPos(btn) {
  const W   = window.innerWidth;
  const H   = window.innerHeight;
  const bW  = btn.offsetWidth  || 140;
  const bH  = btn.offsetHeight || 44;
  const pad = 40;
  btn.style.left = (pad + Math.random() * (W - bW - pad * 2)).toFixed(0) + 'px';
  btn.style.top  = (pad + Math.random() * (H - bH - pad * 2)).toFixed(0) + 'px';
}

function _hideMuteChase() {
  if (_muteChaseRafId)       { cancelAnimationFrame(_muteChaseRafId);   _muteChaseRafId = null; }
  if (_muteChaseTeleportId)  { clearTimeout(_muteChaseTeleportId);      _muteChaseTeleportId = null; }
  if (_muteChaseCountdownId) { clearTimeout(_muteChaseCountdownId);     _muteChaseCountdownId = null; }
  if (_muteChaseDeadlineId)  { clearTimeout(_muteChaseDeadlineId);      _muteChaseDeadlineId = null; }
  const el = document.getElementById('mute-chase-overlay');
  if (el) el.remove();
}

// ── Page explosion (penalty for missing the 20 s deadline) ───────────────
function _explodePage(audioCtx) {
  // Kill the alarm audio immediately
  if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
  _hideMuteChase();

  // Phase 1: screen flash — brightness flare then dim to black
  document.body.classList.add('page-exploding');

  // Phase 2: 70 shrapnel emoji particles across the whole viewport
  const SHARDS = ['💥','💥','💥','🔥','🔥','💣','🧨','🔔','✨','💀','🔥','💥'];
  for (let i = 0; i < 70; i++) {
    const el = document.createElement('span');
    el.className = 'explode-shard';
    el.style.left = (Math.random() * window.innerWidth).toFixed(1)  + 'px';
    el.style.top  = (Math.random() * window.innerHeight).toFixed(1) + 'px';

    const angle = Math.random() * Math.PI * 2;
    const dist  = 120 + Math.random() * 260;
    el.style.setProperty('--shard-dx',  (Math.cos(angle) * dist).toFixed(1) + 'px');
    el.style.setProperty('--shard-dy',  (Math.sin(angle) * dist).toFixed(1) + 'px');
    el.style.setProperty('--shard-rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    const dur   = 600 + Math.random() * 700;
    const delay = Math.random() * 300;
    el.style.setProperty('--shard-dur', dur.toFixed(0) + 'ms');
    el.style.animationDelay = delay.toFixed(0) + 'ms';
    el.textContent = SHARDS[i % SHARDS.length];
    document.body.appendChild(el);
    setTimeout(() => el.remove(), dur + delay + 150);
  }

  // Phase 3: fling every card and major element off-screen
  const targets = [
    ...document.querySelectorAll('.card'),
    ...document.querySelectorAll('.table-head'),
    document.querySelector('header'),
    document.querySelector('main'),
    document.getElementById('portfolio-panel'),
  ].filter(Boolean);

  targets.forEach((el, i) => {
    const angle = Math.random() * Math.PI * 2;
    const dist  = 600 + Math.random() * 600;
    el.style.setProperty('--fling-dx',  (Math.cos(angle) * dist).toFixed(1) + 'px');
    el.style.setProperty('--fling-dy',  (Math.sin(angle) * dist).toFixed(1) + 'px');
    el.style.setProperty('--fling-rot', (Math.random() * 540 - 270).toFixed(0) + 'deg');
    el.style.setProperty('--fling-dur', (500 + Math.random() * 400).toFixed(0) + 'ms');
    el.style.animationDelay = (i * 18).toFixed(0) + 'ms';
    el.classList.add('explode-card');
  });

  // Phase 4: game-over screen fades in at 1.1 s (matches CSS animation delay)
  const screen = document.createElement('div');
  screen.id = 'explosion-screen';
  screen.innerHTML = `
    <div class="expl-skull">💀</div>
    <div class="expl-title">YOU FAILED TO MUTE THE ALARM</div>
    <div class="expl-sub">The alarm has claimed another victim.<br>Maybe you'll be faster next time.</div>
    <button class="expl-restore" onclick="location.reload()">↺ Restore Page</button>`;
  document.body.appendChild(screen);
}


async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  _updatePermissionBanner();
  return result === 'granted';
}

function _notifPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

function _updatePermissionBanner() {
  const banner = document.getElementById('alerts-permission-banner');
  if (!banner) return;
  banner.classList.toggle('hidden', _notifPermission() !== 'denied');
}

// ── LocalStorage helpers ──────────────────────────────────────────────────
function _loadAlerts() {
  try { return JSON.parse(localStorage.getItem(LS_ALERTS) || '{}'); } catch { return {}; }
}

function _saveAlerts(alerts) {
  localStorage.setItem(LS_ALERTS, JSON.stringify(alerts));
  _updateBellBadge();
}

function _updateBellBadge() {
  const badge = document.getElementById('alert-bell-badge');
  const count = document.getElementById('alert-active-count');
  if (!badge) return;
  const alerts = _loadAlerts();
  const active = Object.values(alerts).filter(a => !a.fired).length;
  badge.textContent = active;
  badge.classList.toggle('hidden', active === 0);
  if (count) {
    count.textContent = `${active} active`;
    count.classList.toggle('hidden', active === 0);
  }
}

// ── Create / delete / re-arm ──────────────────────────────────────────────
function createAlert(ticker, type, value) {
  if (_notifPermission() === 'default') {
    Notification.requestPermission().then(_updatePermissionBanner);
  }
  const alerts = _loadAlerts();
  const id = `${ticker}_${type}_${Date.now()}`;
  alerts[id] = { id, ticker, type, value: parseFloat(value), createdAt: Date.now(), fired: false };
  _saveAlerts(alerts);
  _startPollingIfNeeded();
  return id;
}

function deleteAlert(id) {
  const alerts = _loadAlerts();
  delete alerts[id];
  _saveAlerts(alerts);
  renderAlertsModal();
}

function rearmAlert(id) {
  const alerts = _loadAlerts();
  if (alerts[id]) alerts[id].fired = false;
  _saveAlerts(alerts);
  renderAlertsModal();
  _startPollingIfNeeded();
}

// ── Polling engine ────────────────────────────────────────────────────────
function _startPollingIfNeeded() {
  const alerts    = _loadAlerts();
  const hasActive = Object.values(alerts).some(a => !a.fired);
  if (hasActive && !_alertPollTimer) {
    _alertPollTimer = setInterval(_pollAlerts, ALERT_POLL_MS);
    _pollAlerts();   // immediate first check
  }
}

function _stopPollingIfIdle() {
  const alerts    = _loadAlerts();
  const hasActive = Object.values(alerts).some(a => !a.fired);
  if (!hasActive && _alertPollTimer) {
    clearInterval(_alertPollTimer);
    _alertPollTimer = null;
  }
}

async function _pollAlerts() {
  const alerts       = _loadAlerts();
  const activeAlerts = Object.values(alerts).filter(a => !a.fired);
  if (!activeAlerts.length) { _stopPollingIfIdle(); return; }

  // Group by ticker — one fetch per ticker even if multiple alerts
  const byTicker = {};
  activeAlerts.forEach(a => {
    if (!byTicker[a.ticker]) byTicker[a.ticker] = [];
    byTicker[a.ticker].push(a);
  });

  await Promise.allSettled(
    Object.entries(byTicker).map(async ([ticker, tickerAlerts]) => {
      try {
        const res  = await fetch(`${API}/score/${encodeURIComponent(ticker)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.error) return;
        const price = data.currentPrice;
        const score = data.score;

        tickerAlerts.forEach(a => {
          let triggered = false;
          let message   = '';
          if (a.type === 'price_above' && price >= a.value) {
            triggered = true;
            message   = `${ticker} is $${price.toFixed(2)} — above your $${a.value} target 🚀`;
          } else if (a.type === 'price_below' && price <= a.value) {
            triggered = true;
            message   = `${ticker} dropped to $${price.toFixed(2)} — below your $${a.value} target ⚠️`;
          } else if (a.type === 'score_above' && score >= a.value) {
            triggered = true;
            message   = `${ticker} AI Score is ${score} — above your ${a.value} threshold 🎯`;
          }
          if (triggered) {
            const fresh = _loadAlerts();
            if (fresh[a.id]) {
              fresh[a.id].fired      = true;
              fresh[a.id].firedAt    = Date.now();
              fresh[a.id].firedPrice = price;
              fresh[a.id].firedScore = score;
              _saveAlerts(fresh);
            }
            _fireNotification(ticker, message);
            _playAlertPing();
            _burstBellEmojis();
            _updateBellBadge();
          }
        });
      } catch (_) { /* network error — skip cycle */ }
    })
  );
  _stopPollingIfIdle();
}

function _fireNotification(ticker, body) {
  if (_notifPermission() !== 'granted') return;
  try {
    const n = new Notification(`StockPicker AI — ${ticker}`, {
      body,
      icon:   'https://cdn-icons-png.flaticon.com/512/2382/2382533.png',
      tag:    `sp-alert-${ticker}`,
      silent: false,
    });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 8000);
  } catch (_) {}
}

// ── Bell burst — sprays 🔔 emojis from the toolbar bell button ────────────
function _burstBellEmojis() {
  const btn = document.getElementById('alert-bell-btn');
  const rect = btn ? btn.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20, width: 36, height: 36 };

  // Origin: centre of the bell button
  const ox = rect.left + rect.width  / 2;
  const oy = rect.top  + rect.height / 2;

  const COUNT = 10;
  const EMOJIS = ['🔔','🔔','🔔','🔔','🔔','🔔','🔔','🛎️','✨','💰'];

  for (let i = 0; i < COUNT; i++) {
    // Spread the angle across a full circle, with a bit of random jitter
    const baseAngle = (i / COUNT) * 360;
    const angle     = (baseAngle + (Math.random() * 36 - 18)) * (Math.PI / 180);
    const dist      = 80 + Math.random() * 90;   // 80–170 px travel

    const dx  = Math.cos(angle) * dist;
    const dy  = Math.sin(angle) * dist - 30;      // slight upward bias
    const rot = (Math.random() * 60 - 30) + 'deg';
    const dur = 700 + Math.random() * 500;        // 700–1200 ms

    const el = document.createElement('span');
    el.className   = 'bell-burst-emoji';
    el.textContent = EMOJIS[i % EMOJIS.length];
    el.style.left  = ox + 'px';
    el.style.top   = oy + 'px';
    el.style.setProperty('--burst-dx',  dx.toFixed(1)  + 'px');
    el.style.setProperty('--burst-dy',  dy.toFixed(1)  + 'px');
    el.style.setProperty('--burst-rot', rot);
    el.style.setProperty('--burst-dur', dur.toFixed(0) + 'ms');
    // Slight stagger: each emoji launches 0–80 ms after the first
    el.style.animationDelay = (i * 40 + Math.random() * 40).toFixed(0) + 'ms';

    document.body.appendChild(el);
    setTimeout(() => el.remove(), dur + 200);
  }
}

// ── Alerts modal open / close / render ────────────────────────────────────
function openAlertsModal() {
  _updatePermissionBanner();
  renderAlertsModal();
  document.getElementById('alerts-modal-overlay').classList.remove('hidden');
}

function closeAlertsModal(event) {
  if (event && event.target !== document.getElementById('alerts-modal-overlay')) return;
  document.getElementById('alerts-modal-overlay').classList.add('hidden');
}

function renderAlertsModal() {
  const list  = document.getElementById('alerts-list');
  const empty = document.getElementById('alerts-empty');
  if (!list) return;

  const alerts  = _loadAlerts();
  const entries = Object.values(alerts).sort((a, b) => b.createdAt - a.createdAt);

  if (!entries.length) {
    list.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  const typeLabel = { price_above: '↑ Price ≥', price_below: '↓ Price ≤', score_above: '★ Score ≥' };
  const typeUnit  = { price_above: '$', price_below: '$', score_above: '' };

  list.innerHTML = entries.map(a => {
    const fired = a.fired;
    const badge = fired
      ? `<span class="alert-row-badge fired">Fired${a.firedPrice != null ? ' @ $'+a.firedPrice.toFixed(2) : ''}</span>`
      : `<span class="alert-row-badge active">Active</span>`;
    const btns = fired
      ? `<button class="alert-row-btn" onclick="rearmAlert('${a.id}')">↺ Re-arm</button>
         <button class="alert-row-btn danger" onclick="deleteAlert('${a.id}')">✕</button>`
      : `<button class="alert-row-btn danger" onclick="deleteAlert('${a.id}')">✕</button>`;
    const when = new Date(a.createdAt).toLocaleDateString(undefined, { month:'short', day:'numeric' });
    return `<div class="alert-row${fired ? ' fired' : ''}">
      <div class="alert-row-left">
        <span class="alert-row-ticker">${a.ticker}</span>
        <span class="alert-row-cond">${typeLabel[a.type]} ${typeUnit[a.type]}${a.value}</span>
        <span class="alert-row-date">${when}</span>
      </div>
      <div class="alert-row-right">${badge}${btns}</div>
    </div>`;
  }).join('');
}

// ── "Set Alert" panel — rendered inside detail modal ─────────────────────
function renderSetAlertPanel(ticker, currentPrice) {
  const pricePlaceholder = currentPrice ? currentPrice.toFixed(2) : '0.00';
  return `<div class="set-alert-panel" id="set-alert-panel-${ticker}">
    <div class="set-alert-title">🔔 Set Alert for <strong>${ticker}</strong></div>
    <div class="set-alert-row">
      <select id="alert-type-sel-${ticker}" class="alert-select">
        <option value="price_above">Price rises above</option>
        <option value="price_below">Price drops below</option>
        <option value="score_above">AI Score reaches</option>
      </select>
      <input id="alert-value-inp-${ticker}" type="number" class="alert-value-input"
        placeholder="${pricePlaceholder}" step="0.01" min="0" />
      <button class="btn btn-primary" style="height:28px;font-size:.75rem;padding:3px 10px;"
        onclick="_submitAlert('${ticker}')">+ Add</button>
    </div>
    <div id="alert-fb-${ticker}" class="alert-feedback hidden"></div>
  </div>`;
}

// ── Alert panel injection: observe modal visibility then append panel ─────
// Uses a MutationObserver on the overlay so we inject AFTER openModal runs.
(function _setupAlertPanelInjector() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) {
    // DOM not ready — defer
    document.addEventListener('DOMContentLoaded', _setupAlertPanelInjector);
    return;
  }
  const observer = new MutationObserver(() => {
    if (overlay.classList.contains('hidden')) return;
    const content = document.getElementById('modal-content');
    if (!content || content.querySelector('.set-alert-panel')) return;
    const tickerEl = content.querySelector('.modal-ticker');
    if (!tickerEl) return;
    const ticker = tickerEl.textContent.trim();
    const priceEl = content.querySelector('.modal-price');
    let price = 0;
    if (priceEl) {
      const m = priceEl.textContent.match(/\$([\d,.]+)/);
      if (m) price = parseFloat(m[1].replace(/,/g, ''));
    }
    const div = document.createElement('div');
    div.innerHTML = renderSetAlertPanel(ticker, price);
    if (div.firstElementChild) content.appendChild(div.firstElementChild);
  });
  observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
})();

function _submitAlert(ticker) {
  const typeEl  = document.getElementById(`alert-type-sel-${ticker}`);
  const valueEl = document.getElementById(`alert-value-inp-${ticker}`);
  const fbEl    = document.getElementById(`alert-fb-${ticker}`);
  if (!typeEl || !valueEl) return;
  const value = parseFloat(valueEl.value);
  if (isNaN(value) || value <= 0) {
    if (fbEl) { fbEl.textContent = '⚠️ Enter a number greater than 0.'; fbEl.classList.remove('hidden'); }
    return;
  }
  createAlert(ticker, typeEl.value, value);
  valueEl.value = '';
  if (fbEl) {
    const lbl = { price_above: `price ≥ $${value}`, price_below: `price ≤ $${value}`, score_above: `score ≥ ${value}` };
    fbEl.textContent = `✅ Alert set: ${ticker} ${lbl[typeEl.value]}`;
    fbEl.classList.remove('hidden');
    setTimeout(() => fbEl.classList.add('hidden'), 3500);
  }
  _updateBellBadge();
}

function renderRecommendations(data) {
  const { health, concentration, recommendations } = data;
  const content = document.getElementById('rec-content');

  // ── Health card ───────────────────────────────────────────────────────────
  const hl = health.label.toLowerCase();
  const healthHTML = `
    <div class="rec-health">
      <div class="rec-health-ring ${hl}">${health.score}</div>
      <div class="rec-health-info">
        <div class="rec-health-label">Portfolio Health: ${health.label}</div>
        <div class="rec-health-summary">${health.summary}</div>
        <div class="rec-health-meta">
          <span class="rec-health-stat">Wtd Score <strong>${health.wScore}</strong></span>
          <span class="rec-health-stat">Wtd RSI <strong>${health.wRsi}</strong></span>
          <span class="rec-health-stat">Holdings <strong>${recommendations.filter(r => r.ticker).length}</strong></span>
        </div>
      </div>
    </div>`;

  // ── Concentration bars ────────────────────────────────────────────────────
  const concRows = concentration.map(c => {
    const cls = c.pct > 60 ? 'over' : c.pct > 45 ? 'warn' : 'ok';
    return `<div class="rec-conc-row">
      <span class="rec-conc-label">${c.sector}</span>
      <div class="rec-conc-track"><div class="rec-conc-fill ${cls}" style="width:${c.pct}%"></div></div>
      <span class="rec-conc-pct">${c.pct}%</span>
    </div>`;
  }).join('');
  const concHTML = `
    <div class="rec-sector-bar">
      <h5>Sector Concentration</h5>
      ${concRows}
    </div>`;

  // ── Action cards ──────────────────────────────────────────────────────────
  const groups = {
    trim:      { label: '🔴 Consider Trimming',  recs: [] },
    rebalance: { label: '🟡 Rebalance',          recs: [] },
    add:       { label: '🟢 Add to Position',    recs: [] },
    hold:      { label: '⚪ Hold — No Action',   recs: [] },
  };
  recommendations.forEach(r => { if (groups[r.type]) groups[r.type].recs.push(r); });

  const icons = { trim: '✂️', rebalance: '⚖️', add: '➕', hold: '📌' };

  const cardsHTML = Object.entries(groups).map(([type, g]) => {
    if (g.recs.length === 0) return '';
    const cards = g.recs.map(r => {
      const tickerChip = r.ticker ? `<span class="rec-card-ticker">${r.ticker}</span>` : '';
      const badge = `<span class="rec-urgency-badge ${r.urgency}">${r.urgency}</span>`;
      const reasons = r.reasons.map(rs => `<li>${rs}</li>`).join('');
      return `
        <div class="rec-card ${type}">
          <span class="rec-card-icon">${icons[type]}</span>
          <div class="rec-card-body">
            <div class="rec-card-title">${tickerChip} ${r.title} ${badge}</div>
            <ul class="rec-card-reasons">${reasons}</ul>
          </div>
        </div>`;
    }).join('');
    return `<div class="rec-section-title">${g.label}</div><div class="rec-cards">${cards}</div>`;
  }).join('');

  content.innerHTML = healthHTML + concHTML + cardsHTML;
}

// ══════════════════════════════════════════════════════════════════════════════
// 50% CLICK REJECTION — because the market doesn't care about your feelings
// ══════════════════════════════════════════════════════════════════════════════

const REJECTION_MSGS = [
  "🚫 ACCESS DENIED. The market rejects your curiosity.",
  "❌ Not today. Try your luck again.",
  "🎲 The algo said no. Flip again.",
  "🔒 Insider trading detected. Just kidding. Still no.",
  "😤 This stock does not want to be clicked right now.",
  "📉 Your click portfolio is underperforming.",
  "🤖 AI Score: Your clicking ability — 12/100.",
  "🛑 Wall Street says: go touch grass first.",
  "🎯 Miss! Click accuracy: 0%. Try again.",
  "💀 REJECTED. The volatility got you.",
  "🙅 The ticker has left the building.",
  "🎰 House wins. Always.",
  "⛔ Insufficient clicking privileges. Please upgrade your plan.",
  "🔮 The market is uncertain. So is your click.",
  "😂 Skill issue.",
];

function rejectClick(card, ticker) {
  // Don't pile on rejections if already shaking
  if (card.classList.contains('card-rejected')) return;

  // Flash the card red + shake
  card.classList.add('card-rejected');
  card.addEventListener('animationend', () => {
    card.classList.remove('card-rejected');
  }, { once: true });

  // Pick a random snarky message and show the full denial overlay
  const msg = REJECTION_MSGS[Math.floor(Math.random() * REJECTION_MSGS.length)];
  showDenialOverlay(ticker, msg);
}

let _denialTimer = null;
function showDenialOverlay(ticker, msg) {
  // Kill any existing denial elements so it always feels fresh
  ['denial-vignette','denial-overlay','denial-msg-bar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  clearTimeout(_denialTimer);

  const ANIM_MS = 1000;

  // 1 ── Red vignette border flash
  const vignette = document.createElement('div');
  vignette.id        = 'denial-vignette';
  vignette.className = 'denial-vignette';
  document.body.appendChild(vignette);

  // 2 ── Dark overlay with the stamp
  const overlay = document.createElement('div');
  overlay.id        = 'denial-overlay';
  overlay.className = 'denial-overlay';
  overlay.innerHTML = `
    <div class="denial-stamp">
      <div class="denial-stamp-icon">⛔</div>
      <div class="denial-stamp-text">DENIED</div>
      <div class="denial-stamp-sub">${ticker}</div>
    </div>`;
  document.body.appendChild(overlay);

  // 3 ── Snarky message bar slides up from bottom
  const msgBar = document.createElement('div');
  msgBar.id        = 'denial-msg-bar';
  msgBar.className = 'denial-msg-bar';
  msgBar.textContent = msg;
  document.body.appendChild(msgBar);

  // 4 ── Laugh track 😂
  playLaughTrack();

  // Clean up all three after animation completes
  _denialTimer = setTimeout(() => {
    [vignette, overlay, msgBar].forEach(el => el.remove());
  }, ANIM_MS + 80);
}

// ── Synthesised laugh track via Web Audio API ─────────────────────────────
function playLaughTrack() {
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (_) { return; } // browser doesn't support Web Audio — silently skip

  // Master gain so we can fade the whole laugh out at the end
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.55, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.4);
  master.connect(ctx.destination);

  // Each "laugh voice" is a short burst of descending tones
  // We layer several voices with different timings & pitches for a crowd feel
  const voices = [
    { baseFreq: 420, offset: 0.00, count: 5, speed: 0.13, vol: 0.55 },
    { baseFreq: 370, offset: 0.05, count: 6, speed: 0.12, vol: 0.45 },
    { baseFreq: 500, offset: 0.02, count: 4, speed: 0.15, vol: 0.35 },
    { baseFreq: 340, offset: 0.08, count: 5, speed: 0.11, vol: 0.40 },
    { baseFreq: 460, offset: 0.03, count: 6, speed: 0.14, vol: 0.30 },
    { baseFreq: 390, offset: 0.11, count: 4, speed: 0.13, vol: 0.38 },
  ];

  voices.forEach(({ baseFreq, offset, count, speed, vol }) => {
    for (let i = 0; i < count; i++) {
      const t = ctx.currentTime + offset + i * speed;

      // Each "ha" = a quick pitch-bend from high → low (the "ha" shape)
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Slight random variation so voices don't sound identical
      const freq = baseFreq * (1 + (Math.random() - 0.5) * 0.12);
      osc.frequency.setValueAtTime(freq * 1.18, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t + 0.09);

      // Attack → short sustain → decay envelope
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.018);
      gain.gain.setValueAtTime(vol,       t + 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.115);

      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.13);

      // Add a subtle overtone (2nd harmonic) for a more "vocal" texture
      const osc2  = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2.2, t);
      osc2.frequency.exponentialRampToValueAtTime(freq * 1.4, t + 0.09);
      gain2.gain.setValueAtTime(0, t);
      gain2.gain.linearRampToValueAtTime(vol * 0.22, t + 0.018);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
      osc2.connect(gain2);
      gain2.connect(master);
      osc2.start(t);
      osc2.stop(t + 0.12);
    }
  });

  // Auto-close the AudioContext after the laugh finishes
  setTimeout(() => { try { ctx.close(); } catch (_) {} }, 2600);
}

// ── Keep old toast function as a no-op alias so nothing breaks ────────────
let _toastTimer = null;
function showRejectionToast(msg) { /* superseded by showDenialOverlay */ }

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATIONS — Refresh button spin
// ══════════════════════════════════════════════════════════════════════════════

function setRefreshSpinning(on) {
  const icon = document.getElementById('refresh-icon');
  if (!icon) return;
  if (on) icon.classList.add('btn-spinning');
  else    icon.classList.remove('btn-spinning');
}

// ══════════════════════════════════════════════════════════════════════════════
// LIVE FEED — Continuously pumps fresh top picks into the card grid
// ══════════════════════════════════════════════════════════════════════════════

const FEED_INTERVAL_MS = 9000;
const FEED_SECTORS     = ['all', 'Technology', 'Healthcare', 'Financials', 'Consumer', 'Energy', 'Industrials'];
const FEED_MODES       = ['random', 'balanced', 'momentum', 'value', 'quality', 'technical'];
const FEED_MAX_CARDS   = 30;

let _feedRunning       = false;
let _feedTimerId       = null;
let _feedProgressTimer = null;
let _feedStockPool     = [];
let _feedCycleStart    = 0;

function toggleLiveFeed() {
  if (_feedRunning) stopLiveFeed();
  else              startLiveFeed();
}

function startLiveFeed() {
  _feedRunning = true;
  const btn   = document.getElementById('live-toggle');
  const badge = document.getElementById('live-badge');
  const bar   = document.getElementById('feed-progress-bar');
  btn.textContent     = '⏸ Pause Feed';
  btn.classList.add('active');
  badge.style.display = 'inline-flex';
  bar.style.display   = 'block';

  if (stockData.length > 0) {
    _feedStockPool = [...stockData];
    document.getElementById('cards-grid').classList.remove('hidden');
    document.getElementById('table-head').classList.remove('hidden');
  }
  _runFeedCycle();
}

function stopLiveFeed() {
  _feedRunning = false;
  clearTimeout(_feedTimerId);
  cancelAnimationFrame(_feedProgressTimer);
  const btn   = document.getElementById('live-toggle');
  const badge = document.getElementById('live-badge');
  const bar   = document.getElementById('feed-progress-bar');
  const fill  = document.getElementById('feed-progress-fill');
  btn.textContent     = '▶ Live Feed';
  btn.classList.remove('active');
  badge.style.display = 'none';
  bar.style.display   = 'none';
  if (fill) fill.style.width = '0%';
}

async function _runFeedCycle() {
  if (!_feedRunning) return;
  const sector = FEED_SECTORS[Math.floor(Math.random() * FEED_SECTORS.length)];
  const mode   = FEED_MODES[Math.floor(Math.random() * FEED_MODES.length)];

  try {
    const res  = await fetch(`${API}/top-stocks?sector=${encodeURIComponent(sector)}&mode=${mode}`);
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    const incoming = data.stocks || [];

    if (incoming.length > 0) {
      const grid         = document.getElementById('cards-grid');
      const shownTickers = new Set([...grid.querySelectorAll('.card')].map(c => c.dataset.ticker));

      const candidate = incoming
        .sort((a, b) => b.score - a.score)
        .find(s => !shownTickers.has(s.ticker)) || incoming[0];

      if (!_feedStockPool.find(s => s.ticker === candidate.ticker)) {
        _feedStockPool.push(candidate);
        stockData = _feedStockPool;
        persistScoreHistory([candidate]);
      }

      const card = buildCard(candidate, 1);
      card.classList.add('card-drop', 'card-glow');

      if (grid.firstChild) grid.insertBefore(card, grid.firstChild);
      else grid.appendChild(card);

      _renumberFeedCards(grid);
      requestAnimationFrame(() => drawSparkline(candidate));
      _trimFeedGrid(grid);

      document.getElementById('last-updated').textContent =
        'Live · ' + new Date().toLocaleTimeString();
    }
  } catch (_) { /* silent — feed keeps going */ }

  if (_feedRunning) {
    _feedCycleStart = performance.now();
    _animateFeedProgress();
    _feedTimerId = setTimeout(_runFeedCycle, FEED_INTERVAL_MS);
  }
}

function _animateFeedProgress() {
  const fill = document.getElementById('feed-progress-fill');
  if (!fill || !_feedRunning) return;
  const pct = Math.min(((performance.now() - _feedCycleStart) / FEED_INTERVAL_MS) * 100, 100);
  fill.style.width = pct + '%';
  if (pct < 100 && _feedRunning) {
    _feedProgressTimer = requestAnimationFrame(_animateFeedProgress);
  } else {
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => { fill.style.transition = 'width 0.25s linear'; });
  }
}

function _renumberFeedCards(grid) {
  const medals = ['🥇','🥈','🥉'];
  [...grid.querySelectorAll('.card')].forEach((card, i) => {
    const rankEl = card.querySelector('.row-rank');
    if (!rankEl) return;
    const rank = i + 1;
    if (rank <= 3) {
      rankEl.textContent = medals[rank - 1];
      rankEl.classList.add('top3');
    } else {
      rankEl.textContent = `#${rank}`;
      rankEl.classList.remove('top3');
    }
  });
}

function _trimFeedGrid(grid) {
  const cards = [...grid.querySelectorAll('.card')];
  if (cards.length <= FEED_MAX_CARDS) return;
  cards.slice(FEED_MAX_CARDS).forEach(card => {
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    card.style.opacity    = '0';
    card.style.transform  = 'translateX(20px)';
    setTimeout(() => card.remove(), 420);
  });
}
