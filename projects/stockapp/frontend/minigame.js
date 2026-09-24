/* ── Name That Stock! — Minigame ─────────────────────────────────────────── */
/* Standalone IIFE — exposes only openMinigame() globally                    */

(function () {
  'use strict';

  // ── Constants ─────────────────────────────────────────────────────────────
  const API          = 'http://127.0.0.1:5050/api';
  const TOTAL_ROUNDS = 7;
  const LS_HIGHSCORE = 'mg_nts_highscore';
  // Points awarded based on how many clues were needed to guess correctly
  const POINTS_TABLE = [500, 350, 250, 150, 100, 75, 50];

  // All possible clue types — ordered from least to most revealing
  const CLUE_TYPES = [
    'sector',      // "Technology"
    'marketCap',   // "Large Cap ($1.2T)"
    'pe',          // "P/E Ratio: 28.4"
    'rsi',         // "RSI: 62 — slightly overbought"
    'week52',      // "52-week range: $141 – $199  ·  currently at 78%"
    'epsGrowth',   // "EPS Growth: +23%"
    'profitMargin',// "Profit Margin: 25.3%"
    'debtToEquity',// "Debt/Equity: 0.42"
    'sparkline',   // mini chart — very revealing
    'dividendYield',// "Dividend Yield: 1.4%"
  ];

  const HINT_PENALTY = 75;  // pts deducted from current prize when hint is used

  const SECTORS = ['Technology','Healthcare','Financials','Consumer','Energy','Industrials'];

  // ── Mascot — Penny the Bull 🐂 ────────────────────────────────────────────
  const MASCOT_LINES = {
    idle: [
      "Alright, let's see what you've got! 📈",
      "A new stock awaits — study those clues!",
      "Think like a trader. You got this! 💪",
      "Fresh round, fresh brain. Let's go!",
      "The market never sleeps… and neither do I 🐂",
    ],
    thinking: [
      "Fetching the latest news… hang tight!",
      "Digging through the headlines… 🗞️",
      "One sec, checking the wire…",
    ],
    hint: [
      "Here's a headline to chew on 🗞️ Don't say I never helped!",
      "Hot off the press! This should narrow it down…",
      "A little birdie told me this 🐦 Use it wisely!",
      "News hint unlocked! Minus some points, but hey 😅",
    ],
    // ── Wrong-guess anger tiers (escalate with wrongStreak) ─────────────────
    mad1: [
      "Really? That's your guess?! Come ON. 😠",
      "Ugh. Did you even look at the clues?! 😠",
      "That was… not it. Not even a little. 😠",
      "I'm not mad, I'm just — okay I'm a little mad. 😠",
      "Wrong! The yellows ARE in there, just not THERE. 😠",
      "Ooh so close — and yet so wrong. 😠",
      "Some greens and still wrong. Frustrating, right? Me too. 😠",
    ],
    mad2: [
      "AGAIN?! Are you serious right now?! 😤",
      "I literally gave you clues. CLUES. And you guessed THAT?! 😤",
      "My portfolio has lost less value than your guesses today. 😤",
      "Every wrong guess hurts me personally. Just so you know. 😤",
      "The letters are RIGHT THERE, just rearrange!! 😤",
      "Yellow means it EXISTS. Use. Your. Brain. 😤",
      "You have GREEN letters and you're STILL wrong?! HOW?! 😤",
    ],
    mad3: [
      "I AM GOING TO LOSE IT. HOW ARE NONE OF THOSE RIGHT?! 😡",
      "ARE YOU EVEN TRYING?! This is a disaster. A DISASTER. 😡",
      "I've seen rookie traders guess better. IN THEIR SLEEP. 😡",
      "My horns are VIBRATING with rage right now. 😡",
      "THE LETTERS. ARE. IN. THERE. SOMEWHERE. FIND THEM!! 😡",
      "YELLOW MEANS IT'S IN THE WORD!! I CAN'T!! 😡",
      "That's it. I'm done. I'm going home. …okay I can't leave. JUST GUESS RIGHT! 😡",
    ],
    correct: [
      "NAILED IT! 🎉 You're basically Warren Buffett!",
      "Correct! The bulls are charging! 🐂📈",
      "Yes!! The market approves of this answer 🚀",
      "Boom! Right on the money — literally! 💰",
      "You read those clues like a pro! ✨",
    ],
    streak: [
      "ON FIRE! 🔥🔥 The streak multiplier is yours!",
      "STREAK BONUS! You're unstoppable right now 🐂💨",
      "Three in a row?! The crowd goes wild! 🎊",
      "The streak continues! Don't stop now! 🔥",
    ],
    skip: [
      "No worries, that one was tricky 😬 Shake it off!",
      "Skipped! Sometimes you just have to cut your losses 📉",
      "Even pros sit out some trades 🤷 Next round!",
      "This one slipped away… on to the next! 💨",
    ],
    clue: [
      "New clue revealed! Does that change anything? 🧐",
      "More info, more power! Reassess and fire away!",
      "Every clue narrows it down — think it through 🔍",
      "Interesting… let that clue sink in for a moment!",
    ],
  };

  function _setMascot(mood, overrideLine) {
    if (!mascotEl) return;
    const lines = MASCOT_LINES[mood] || MASCOT_LINES.idle;
    const line  = overrideLine || lines[Math.floor(Math.random() * lines.length)];
    const faces = {
      idle:     '🐂',
      thinking: '🤔',
      hint:     '💡',
      mad1:     '😠',
      mad2:     '😤',
      mad3:     '😡',
      correct:  '🎉',
      streak:   '🔥',
      skip:     '😬',
      clue:     '🧐',
    };
    const face = faces[mood] || '🐂';

    mascotEl.dataset.mood = mood;
    mascotEl.querySelector('.mg-mascot-face').textContent = face;
    mascotEl.querySelector('.mg-mascot-bubble').textContent = line;

    // mad3 gets a rage-shake instead of the normal bounce
    if (mood === 'mad3') {
      mascotEl.classList.remove('mg-mascot-bounce', 'mg-mascot-rage');
      void mascotEl.offsetWidth;
      mascotEl.classList.add('mg-mascot-rage');
    } else {
      mascotEl.classList.remove('mg-mascot-bounce', 'mg-mascot-rage');
      void mascotEl.offsetWidth;
      mascotEl.classList.add('mg-mascot-bounce');
    }
  }



  // ── State ─────────────────────────────────────────────────────────────────
  let pool       = [];
  let allTickers = [];   // flat list for wrong-answer decoys
  let roundIdx, score, streak, history;
  let revealedClues, answered, guessHistory, wrongStreak;
  let hintUsed, hintPenalty, revealedLetters;  // per-round hint state
  let inputMode  = 'choice'; // 'choice' | 'type'
  let overlay, card, streakBadge, multFlash, mascotEl;

  // ── Public entry point ────────────────────────────────────────────────────
  window.openMinigame = async function () {
    _ensureDOM();
    overlay.classList.add('open');
    document.addEventListener('keydown', _onKey);
    await _startGame();
  };

  function _closeGame() {
    overlay.classList.remove('open');
    document.removeEventListener('keydown', _onKey);
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  function _onKey(e) {
    if (!overlay.classList.contains('open')) return;
    if (e.key === 'Escape') { _closeGame(); return; }
  }

  // ── Game lifecycle ─────────────────────────────────────────────────────────
  async function _startGame() {
    pool = []; roundIdx = 0; score = 0; streak = 0; history = [];
    _showLoading('Fetching live stocks…');
    try {
      pool = await _fetchPool();
    } catch (err) {
      _showLoading(`⚠️ Could not load stocks: ${err.message}`);
      return;
    }
    if (pool.length < TOTAL_ROUNDS) {
      _showLoading(`⚠️ Only ${pool.length} stocks available — need ${TOTAL_ROUNDS}.`);
      return;
    }
    _showRound();
  }

  async function _fetchPool() {
    // Fetch two random sector batches then merge + dedupe + shuffle
    const sA = SECTORS[Math.floor(Math.random() * SECTORS.length)];
    const sB = SECTORS[Math.floor(Math.random() * SECTORS.length)];
    const [a, b] = await Promise.all([
      fetch(`${API}/top-stocks?sector=${encodeURIComponent(sA)}&mode=random`).then(r => r.json()),
      fetch(`${API}/top-stocks?sector=${encodeURIComponent(sB)}&mode=momentum`).then(r => r.json()),
    ]);
    const combined = [...(a.stocks || a || []), ...(b.stocks || b || [])];
    const seen = new Set();
    const unique = combined.filter(s => {
      if (seen.has(s.ticker)) return false;
      seen.add(s.ticker);
      return true;
    });
    // Keep a full flat ticker list for decoy generation
    allTickers = unique.map(s => s.ticker);
    // Shuffle
    for (let i = unique.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [unique[i], unique[j]] = [unique[j], unique[i]];
    }
    return unique;
  }

  // ── Round display ─────────────────────────────────────────────────────────
  function _showRound() {
    answered        = false;
    revealedClues   = 1;   // start with 1 clue visible
    hintUsed        = false;
    hintPenalty     = 0;
    revealedLetters = new Set();
    guessHistory    = [];  // { guess, result[] } per wrong attempt this round
    wrongStreak     = 0;   // resets each round; drives anger escalation

    _setMascot('idle');
    const stock = pool[roundIdx];
    _renderRound(stock);
  }

  // ── Clue builders ─────────────────────────────────────────────────────────
  function _buildClue(type, s) {
    switch (type) {
      case 'sector':
        return { label: 'Sector', html: `<span class="hi">${s.sector || 'Unknown'}</span>` };

      case 'marketCap': {
        const mc = s.marketCap;
        let capStr, capLabel;
        if (!mc) { capStr = 'N/A'; capLabel = ''; }
        else if (mc >= 200e9) { capStr = `$${(mc/1e12).toFixed(1)}T`; capLabel = 'Mega Cap'; }
        else if (mc >= 10e9)  { capStr = `$${(mc/1e9).toFixed(0)}B`;  capLabel = 'Large Cap'; }
        else if (mc >= 2e9)   { capStr = `$${(mc/1e9).toFixed(1)}B`;  capLabel = 'Mid Cap'; }
        else                  { capStr = `$${(mc/1e6).toFixed(0)}M`;  capLabel = 'Small Cap'; }
        return { label: 'Market Cap', html: `<span class="hi">${capLabel}</span> &nbsp;<span style="color:var(--muted);font-size:.8em">(${capStr})</span>` };
      }

      case 'pe': {
        const pe = s.pe;
        if (!pe) return { label: 'P/E Ratio', html: `<span class="warn">N/A</span>` };
        const cls = pe < 15 ? 'up' : pe > 35 ? 'dn' : 'hi';
        return { label: 'P/E Ratio', html: `<span class="${cls}">${pe.toFixed(1)}×</span>` };
      }

      case 'rsi': {
        const rsi = s.rsi ?? 50;
        let note;
        if (rsi >= 70) note = '<span class="dn">overbought</span>';
        else if (rsi <= 30) note = '<span class="up">oversold</span>';
        else if (rsi >= 55) note = '<span class="warn">slightly elevated</span>';
        else note = '<span style="color:var(--muted)">neutral zone</span>';
        return { label: 'RSI (14)', html: `<span class="hi">${rsi.toFixed(0)}</span> — ${note}` };
      }

      case 'week52': {
        const lo = s.week52Low ?? s.low52w;
        const hi = s.week52High ?? s.high52w;
        const pct = s.week52RangePct ?? s.rangePct;
        if (!lo || !hi) return null;
        const barFill = Math.round(pct || 0);
        const barCls  = barFill >= 75 ? 'up' : barFill <= 25 ? 'dn' : 'warn';
        return {
          label: '52-Week Range',
          html: `$${lo.toFixed(0)} – $${hi.toFixed(0)} &nbsp;·&nbsp; <span class="${barCls}">${barFill}% of range</span>`
        };
      }

      case 'epsGrowth': {
        const eg = s.epsGrowth;
        if (eg == null) return null;
        const cls = eg >= 15 ? 'up' : eg < 0 ? 'dn' : 'warn';
        const sign = eg >= 0 ? '+' : '';
        return { label: 'EPS Growth (YoY)', html: `<span class="${cls}">${sign}${eg.toFixed(1)}%</span>` };
      }

      case 'profitMargin': {
        const pm = s.profitMargin;
        if (pm == null) return null;
        const cls = pm >= 20 ? 'up' : pm < 5 ? 'dn' : 'warn';
        return { label: 'Profit Margin', html: `<span class="${cls}">${pm.toFixed(1)}%</span>` };
      }

      case 'debtToEquity': {
        const de = s.debtToEquity;
        if (de == null) return null;
        const cls = de < 0.5 ? 'up' : de > 2 ? 'dn' : 'warn';
        return { label: 'Debt / Equity', html: `<span class="${cls}">${de.toFixed(2)}</span>` };
      }

      case 'sparkline': {
        const spark = s.sparkline || s.spark;
        if (!spark || spark.length < 5) return null;
        return { label: 'Price Trend (90 days)', html: '', sparkData: spark };
      }

      case 'dividendYield': {
        const dy = s.dividendYield;
        if (!dy) return { label: 'Dividend Yield', html: `<span class="warn">No dividend</span>` };
        const cls = dy >= 0.03 ? 'up' : 'hi';
        return { label: 'Dividend Yield', html: `<span class="${cls}">${(dy * 100).toFixed(2)}%</span>` };
      }

      default: return null;
    }
  }

  function _availableClues(s) {
    return CLUE_TYPES.map((t, i) => ({ type: t, idx: i, clue: _buildClue(t, s) }))
                     .filter(c => c.clue !== null);
  }

  // ── Sparkline SVG ─────────────────────────────────────────────────────────
  function _sparkSVG(data) {
    const W = 460, H = 48;
    const pts = data;
    const minV = Math.min(...pts), maxV = Math.max(...pts);
    const rng = maxV - minV || 1;
    const xs = pts.map((_, i) => (i / (pts.length - 1)) * W);
    const ys = pts.map(v => H - ((v - minV) / rng) * (H - 4) - 2);
    const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const up = pts[pts.length - 1] >= pts[0];
    const col = up ? 'var(--green)' : 'var(--red)';
    const fillD = `${d} L${W},${H} L0,${H} Z`;
    const gid = 'sg' + Math.random().toString(36).slice(2);
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" class="mg-clue-spark">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${col}" stop-opacity=".25"/>
          <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${fillD}" fill="url(#${gid})" />
      <path d="${d}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>`;
  }


  // ── Render the active round ────────────────────────────────────────────────
  function _renderRound(s) {
    const avail    = _availableClues(s);
    const clueList = avail.slice(0, revealedClues);
    const maxClues = avail.length;
    const ptsIdx   = Math.min(revealedClues - 1, POINTS_TABLE.length - 1);
    const pts      = Math.max(0, POINTS_TABLE[ptsIdx] - hintPenalty);
    const ptsCls   = ptsIdx === 0 && hintPenalty === 0 ? '' : ptsIdx <= 2 ? 'decayed' : 'low';

    const cluesHTML = clueList.map((c, i) => {
      const body = c.clue.sparkData
        ? `<div class="mg-clue-label">${c.clue.label}</div>${_sparkSVG(c.clue.sparkData)}`
        : `<div class="mg-clue-label">${c.clue.label}</div><div class="mg-clue-text">${c.clue.html}</div>`;
      return `<div class="mg-clue">
        <div class="mg-clue-num">${i + 1}</div>
        <div class="mg-clue-body">${body}</div>
      </div>`;
    }).join('');

    const canReveal = !answered && revealedClues < maxClues;
    const nextCost  = POINTS_TABLE[Math.min(revealedClues, POINTS_TABLE.length - 1)];
    const revealLabel = canReveal
      ? `<button class="mg-reveal-btn" id="mg-reveal">👁 Reveal clue ${revealedClues + 1} of ${maxClues} <span style="color:var(--muted);font-size:.7em">(next guess worth ${nextCost} pts)</span></button>`
      : `<button class="mg-reveal-btn" disabled>All clues revealed</button>`;

    const hintBtnHTML = !answered
      ? (hintUsed
          ? `<div class="mg-hint-used-label">💡 Hint used <span style="color:var(--red)">−${HINT_PENALTY} pts</span></div>`
          : `<button class="mg-hint-btn" id="mg-hint-btn">💡 News Hint <span class="mg-hint-cost">−${HINT_PENALTY} pts</span></button>`)
      : '';

    // Ticker letter tiles — shown once hint has been used (or if at least one
    // letter has been revealed), persisted across clue reveals via state
    const tilesHTML = hintUsed ? _buildTickerTilesHTML(s.ticker) : '';

    const choicesHTML = _buildChoicesHTML(s.ticker);

    const dotsHTML = Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
      let cls = '';
      if (i < history.length) cls = `done-${history[i].outcome}`;
      else if (i === roundIdx) cls = 'current';
      return `<div class="mg-dot ${cls}"></div>`;
    }).join('');

    card.innerHTML = `
      <div class="mg-header">
        <div class="mg-title"><span class="mg-title-icon">🔍</span> Name That Stock!</div>
        <div class="mg-meta">
          Round <span class="mg-meta-val">${roundIdx + 1}/${TOTAL_ROUNDS}</span>
          &nbsp;·&nbsp; Score <span class="mg-meta-val" id="mg-score-disp">${score}</span>
        </div>
        <button class="mg-close" id="mg-close-btn">✕</button>
      </div>
      <div class="mg-body">
        <div class="mg-round-intro">Given these clues, which stock is this?</div>
        <div class="mg-points-available">
          <span class="mg-pts-label">Worth</span>
          <span class="mg-pts-value ${ptsCls}" id="mg-pts-val">${pts}</span>
          <span class="mg-pts-label">pts if correct now</span>
        </div>
        <div class="mg-clues" id="mg-clues-list">${cluesHTML}</div>
        ${guessHistory.length ? _buildGuessHistoryHTML(guessHistory) : ''}
        ${answered ? '' : revealLabel}
        <div id="mg-hint-zone"></div>
        ${tilesHTML}
        ${hintBtnHTML}
        ${answered ? _buildAnswerReveal(s) : choicesHTML}
        ${answered
          ? `<button class="mg-next-btn" id="mg-next-btn">${roundIdx + 1 < TOTAL_ROUNDS ? '▶ Next Round' : '🏁 See Results'}</button>`
          : `<button class="mg-skip-btn" id="mg-skip-btn">↷ Skip this stock (0 pts)</button>`}
        <div class="mg-round-dots">${dotsHTML}</div>
      </div>
      <div class="mg-streak-badge" id="mg-streak">${streak}🔥 Streak</div>
      <div class="mg-multiplier-flash" id="mg-multi-flash"></div>`;

    document.getElementById('mg-close-btn').addEventListener('click', _closeGame);

    if (!answered) {
      const revealBtn = document.getElementById('mg-reveal');
      if (revealBtn) revealBtn.addEventListener('click', _revealNextClue);
      document.getElementById('mg-skip-btn').addEventListener('click', _skipRound);
      const hintBtn = document.getElementById('mg-hint-btn');
      if (hintBtn) hintBtn.addEventListener('click', () => _useHint(s.ticker));
      _bindChoiceButtons(s.ticker);
    } else {
      document.getElementById('mg-next-btn').addEventListener('click', _nextRound);
    }

    streakBadge = document.getElementById('mg-streak');
    multFlash   = document.getElementById('mg-multi-flash');
    streakBadge.classList.toggle('show', streak >= 3);
  }


  // ── Multiple choice helpers ───────────────────────────────────────────────
  function _buildChoicesHTML(correctTicker) {
    const choices = _pickChoices(correctTicker);
    if (inputMode === 'type') {
      return `
        <div class="mg-input-row">
          <input class="mg-ticker-input" id="mg-type-input" type="text" maxlength="6"
                 placeholder="Type ticker…" autocomplete="off" spellcheck="false"/>
          <button class="mg-submit-btn" id="mg-type-submit">Submit</button>
        </div>
        <div class="mg-mode-hint">
          <span id="mg-switch-mode">Switch to multiple choice</span>
        </div>`;
    }
    const btns = choices.map(t =>
      `<button class="mg-choice-btn" data-ticker="${t}">${t}</button>`
    ).join('');
    return `
      <div class="mg-choices" id="mg-choices">${btns}</div>
      <div class="mg-mode-hint">
        <span id="mg-switch-mode">Type ticker instead</span>
      </div>`;
  }

  function _pickChoices(correctTicker) {
    const decoys = allTickers.filter(t => t !== correctTicker);
    for (let i = decoys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [decoys[i], decoys[j]] = [decoys[j], decoys[i]];
    }
    const choices = [correctTicker, ...decoys.slice(0, 3)];
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
  }

  function _bindChoiceButtons(correctTicker) {
    const modeSwitch = document.getElementById('mg-switch-mode');
    if (modeSwitch) {
      modeSwitch.addEventListener('click', () => {
        inputMode = inputMode === 'choice' ? 'type' : 'choice';
        _renderRound(pool[roundIdx]);
      });
    }
    if (inputMode === 'type') {
      const input  = document.getElementById('mg-type-input');
      const submit = document.getElementById('mg-type-submit');
      if (!input || !submit) return;
      input.focus();
      const doSubmit = () => {
        const val = input.value.trim().toUpperCase();
        if (!val) {
          input.classList.add('shake');
          setTimeout(() => input.classList.remove('shake'), 400);
          return;
        }
        _processGuess(val, correctTicker);
      };
      submit.addEventListener('click', doSubmit);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') doSubmit(); });
    } else {
      document.querySelectorAll('.mg-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => _processGuess(btn.dataset.ticker, correctTicker));
      });
    }
  }


  // ── Guess processing ──────────────────────────────────────────────────────
  function _processGuess(guess, correctTicker) {
    if (answered) return;

    const isCorrect = guess.toUpperCase() === correctTicker.toUpperCase();
    const ptsIdx    = Math.min(revealedClues - 1, POINTS_TABLE.length - 1);

    if (isCorrect) {
      answered = true;
      streak++;
      const multiplier = streak >= 3 ? streak : 1;
      const earned = Math.max(0, POINTS_TABLE[ptsIdx] - hintPenalty);
      const final  = earned * multiplier;
      score += final;
      if (streak >= 3 && multFlash) {
        multFlash.textContent = `×${multiplier}`;
        multFlash.classList.remove('animate');
        void multFlash.offsetWidth;
        multFlash.classList.add('animate');
      }
      history.push({ ticker: correctTicker, guess, outcome: 'correct', pts: final, clues: revealedClues });

      _setMascot(streak >= 3 ? 'streak' : 'correct');

      // Highlight correct button if in choice mode
      if (inputMode === 'choice') {
        document.querySelectorAll('.mg-choice-btn').forEach(btn => {
          btn.disabled = true;
          if (btn.dataset.ticker === correctTicker) btn.classList.add('correct');
        });
      }

      _renderRound(pool[roundIdx]);

    } else {
      // Wrong guess — record it with per-letter Wordle result, don't end round
      const result = _scoreGuess(guess.toUpperCase(), correctTicker.toUpperCase());
      guessHistory.push({ guess: guess.toUpperCase(), result });

      // Pick anger tier based on how many times they've been wrong this round
      wrongStreak++;
      const angerTier = wrongStreak >= 3 ? 'mad3' : wrongStreak === 2 ? 'mad2' : 'mad1';
      _setMascot(angerTier);

      // Shake the chosen button / input
      if (inputMode === 'choice') {
        document.querySelectorAll('.mg-choice-btn').forEach(btn => {
          if (btn.dataset.ticker === guess) {
            btn.classList.add('wrong');
            btn.disabled = true;
          }
        });
      }
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 400);

      // Re-render so the guess history row appears; input stays active
      _renderRound(pool[roundIdx]);
    }
  }

  // ── Wordle scoring ────────────────────────────────────────────────────────
  // Returns an array of 'correct' | 'present' | 'absent' for each char in guess.
  // Handles duplicate letters correctly with a two-pass consume approach.
  function _scoreGuess(guess, target) {
    const result      = Array(guess.length).fill('absent');
    const targetLeft  = target.split('');   // consumed in pass 2
    const guessLeft   = guess.split('');

    // Pass 1 — exact matches (green)
    for (let i = 0; i < guess.length; i++) {
      if (i < target.length && guess[i] === target[i]) {
        result[i]     = 'correct';
        targetLeft[i] = null;   // consumed
        guessLeft[i]  = null;
      }
    }

    // Pass 2 — wrong-position matches (yellow)
    for (let i = 0; i < guess.length; i++) {
      if (guessLeft[i] === null) continue;          // already matched
      const ti = targetLeft.indexOf(guessLeft[i]);
      if (ti !== -1) {
        result[i]      = 'present';
        targetLeft[ti] = null;  // consume so duplicates aren't double-counted
      }
    }

    return result;
  }

  // ── Guess history row ─────────────────────────────────────────────────────
  function _buildGuessHistoryHTML(history) {
    const rows = history.map(({ guess, result }) => {
      const tiles = guess.split('').map((ch, i) => {
        const state = result[i] || 'absent';
        return `<span class="mg-gtile mg-gtile-${state}">${ch}</span>`;
      }).join('');
      return `<div class="mg-guess-row">${tiles}</div>`;
    }).join('');
    return `<div class="mg-guess-history">${rows}</div>`;
  }

  function _buildAnswerReveal(s) {
    const h = history[history.length - 1];
    if (!h) return '';
    const outcome = h.outcome;
    const icon = outcome === 'correct' ? '✅' : outcome === 'skip' ? '⏭' : '❌';
    const title = outcome === 'correct' ? 'Correct!' : outcome === 'skip' ? 'Skipped' : `Wrong — it was ${s.ticker}`;
    const ptsText = h.pts > 0 ? `+${h.pts} points` : '';
    const streakText = streak >= 2 && outcome === 'correct'
      ? `&nbsp;·&nbsp; <span style="color:var(--gold)">${streak}🔥 streak${streak >= 3 ? ` ×${streak} multiplier!` : ''}</span>`
      : '';
    return `
      <div class="mg-answer-reveal ${outcome}">
        <div class="mg-answer-icon">${icon}</div>
        <div class="mg-answer-result">${title}</div>
        <div class="mg-answer-sub"><span class="mg-answer-ticker">${s.ticker}</span> — ${s.name || ''}</div>
        ${ptsText ? `<div class="mg-answer-pts">${ptsText}${streakText}</div>` : ''}
      </div>`;
  }

  function _revealNextClue() {
    revealedClues++;
    _setMascot('clue');
    _renderRound(pool[roundIdx]);
  }

  function _skipRound() {
    answered = true;
    streak   = 0;
    _setMascot('skip');
    history.push({ ticker: pool[roundIdx].ticker, guess: null, outcome: 'skip', pts: 0, clues: revealedClues, attempts: guessHistory.length });
    _renderRound(pool[roundIdx]);
  }

  // ── News Hint ─────────────────────────────────────────────────────────────
  async function _useHint(ticker) {
    if (hintUsed) return;
    hintUsed    = true;
    hintPenalty = HINT_PENALTY;

    // Reveal one letter immediately (before the network call)
    _revealNextLetter(ticker);

    // Swap button for a loading indicator immediately
    const hintBtn = document.getElementById('mg-hint-btn');
    if (hintBtn) {
      hintBtn.disabled  = true;
      hintBtn.textContent = '💡 Loading hint…';
    }

    _setMascot('thinking');

    // Update displayed points (deduct penalty)
    const ptsIdx = Math.min(revealedClues - 1, POINTS_TABLE.length - 1);
    const ptsEl  = document.getElementById('mg-pts-val');
    if (ptsEl) {
      const newPts = Math.max(0, POINTS_TABLE[ptsIdx] - hintPenalty);
      ptsEl.textContent = newPts;
      ptsEl.classList.add('decayed');
    }

    const zone = document.getElementById('mg-hint-zone');

    try {
      const res  = await fetch(`${API}/minigame/hint?ticker=${encodeURIComponent(ticker)}`);
      const data = await res.json();

      if (data.error || !data.title) {
        _renderHintError(zone, data.error || 'No news found.');
        return;
      }

      _renderHintCard(zone, data);

      // Replace the button with the "hint used" label
      if (hintBtn) {
        const label = document.createElement('div');
        label.className = 'mg-hint-used-label';
        label.innerHTML = `💡 Hint used <span style="color:var(--red)">−${HINT_PENALTY} pts</span>`;
        hintBtn.replaceWith(label);
      }
    } catch (err) {
      _renderHintError(zone, 'Could not fetch hint.');
      if (hintBtn) hintBtn.textContent = '💡 Hint unavailable';
    }
  }

  function _renderHintCard(zone, data) {
    // Format publish date nicely if available
    let dateStr = '';
    if (data.publishedAt) {
      try {
        dateStr = new Date(data.publishedAt).toLocaleDateString(undefined,
          { month: 'short', day: 'numeric', year: 'numeric' });
      } catch (_) { /* ignore */ }
    }

    zone.innerHTML = `
      <div class="mg-hint-card">
        <div class="mg-hint-card-header">
          <span class="mg-hint-label-badge">💡 News Hint</span>
          ${data.source ? `<span class="mg-hint-source">${data.source}</span>` : ''}
          ${dateStr    ? `<span class="mg-hint-date">${dateStr}</span>` : ''}
        </div>
        <div class="mg-hint-title">${_escapeHTML(data.title)}</div>
        ${data.summary
          ? `<div class="mg-hint-summary">${_escapeHTML(data.summary)}${data.summary.length >= 280 ? '…' : ''}</div>`
          : ''}
        ${data.url
          ? `<a class="mg-hint-link" href="${data.url}" target="_blank" rel="noopener">Read full article ↗</a>`
          : ''}
      </div>`;

    _setMascot('hint');
  }

  function _renderHintError(zone, msg) {
    zone.innerHTML = `<div class="mg-hint-error">💡 ${_escapeHTML(msg)}</div>`;
  }

  // ── Ticker letter tiles ───────────────────────────────────────────────────
  // Build the HTML for the letter-tile row from current revealedLetters state.
  // Called both during full re-render (via _renderRound) and for in-place
  // live updates (via _refreshTiles).
  function _buildTickerTilesHTML(ticker) {
    const tiles = ticker.split('').map((ch, i) => {
      const revealed = revealedLetters.has(i);
      return revealed
        ? `<span class="mg-tile mg-tile-revealed">${ch}</span>`
        : `<span class="mg-tile mg-tile-hidden">·</span>`;
    }).join('');
    return `<div class="mg-ticker-tiles" id="mg-ticker-tiles">${tiles}</div>`;
  }

  // Pick the next letter to reveal using a fixed order:
  // first char → last char → remaining positions left-to-right.
  // Skips positions already in revealedLetters.
  function _revealNextLetter(ticker) {
    const len    = ticker.length;
    if (len === 0) return;

    // Build the priority order: first, last, then left-to-right middle chars
    const order = [];
    order.push(0);
    if (len > 1) order.push(len - 1);
    for (let i = 1; i < len - 1; i++) order.push(i);

    const next = order.find(i => !revealedLetters.has(i));
    if (next === undefined) return; // all letters already shown
    revealedLetters.add(next);

    // Update tiles in-place if the DOM node already exists
    _refreshTiles(ticker);
  }

  // Surgically update just the tiles row without touching anything else.
  function _refreshTiles(ticker) {
    const existing = document.getElementById('mg-ticker-tiles');
    if (!existing) return;
    const tiles = ticker.split('').map((ch, i) => {
      const revealed = revealedLetters.has(i);
      return revealed
        ? `<span class="mg-tile mg-tile-revealed">${ch}</span>`
        : `<span class="mg-tile mg-tile-hidden">·</span>`;
    }).join('');
    existing.innerHTML = tiles;
    // Animate only the newly revealed tile
    const spans = existing.querySelectorAll('.mg-tile-revealed');
    if (spans.length) spans[spans.length - 1].classList.add('mg-tile-pop');
  }

  function _escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }



  function _nextRound() {
    roundIdx++;
    if (roundIdx >= TOTAL_ROUNDS) {
      _showGameOver();
    } else {
      revealedClues = 1;
      answered      = false;
      _showRound();
    }
  }


  // ── Game over screen ──────────────────────────────────────────────────────
  function _showGameOver() {
    const correct  = history.filter(h => h.outcome === 'correct').length;
    const pct      = Math.round((correct / TOTAL_ROUNDS) * 100);
    const prevBest = parseInt(localStorage.getItem(LS_HIGHSCORE) || '0', 10);
    const newBest  = score > prevBest;
    if (newBest) localStorage.setItem(LS_HIGHSCORE, String(score));
    const hiScore = newBest ? score : prevBest;
    const emoji = pct >= 86 ? '🏆' : pct >= 57 ? '📈' : pct >= 43 ? '🤔' : '📉';
    const title = pct >= 86 ? 'Market Genius!' : pct >= 57 ? 'Solid Analyst' : pct >= 43 ? 'Not Bad' : 'Keep Studying';

    const rows = history.map(h => {
      const clueWord = h.clues === 1 ? '1 clue' : `${h.clues} clues`;
      return `<tr class="${h.outcome}">
        <td class="ticker-cell">${h.ticker}</td>
        <td>${h.guess || '—'}</td>
        <td class="clues-cell">${clueWord}</td>
        <td class="pts-cell">${h.pts > 0 ? '+' + h.pts : 0}</td>
      </tr>`;
    }).join('');

    card.innerHTML = `
      <div class="mg-header">
        <div class="mg-title"><span class="mg-title-icon">🔍</span> Name That Stock!</div>
        <button class="mg-close" id="mg-close-btn">✕</button>
      </div>
      <div class="mg-gameover">
        <div class="mg-gameover-emoji">${emoji}</div>
        <div class="mg-gameover-title">${title}</div>
        <div class="mg-gameover-subtitle">${correct}/${TOTAL_ROUNDS} correct · ${pct}% accuracy</div>
        ${newBest ? '<div class="mg-highscore-badge">🏅 New High Score!</div>' : ''}
        <div class="mg-score-display">
          <div class="mg-score-block">
            <div class="mg-score-block-label">Score</div>
            <div class="mg-score-block-val">${score}</div>
          </div>
          <div class="mg-score-block">
            <div class="mg-score-block-label">Best</div>
            <div class="mg-score-block-val gold">${hiScore}</div>
          </div>
          <div class="mg-score-block">
            <div class="mg-score-block-label">Accuracy</div>
            <div class="mg-score-block-val green">${pct}%</div>
          </div>
        </div>
        <div class="mg-scoreboard">
          <table>
            <thead><tr><th>Ticker</th><th>Your Guess</th><th>Clues Used</th><th>Pts</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="mg-gameover-actions">
          <button class="mg-btn-play-again" id="mg-play-again">▶ Play Again</button>
          <button class="mg-btn-close-gameover" id="mg-close-gameover">✕ Close</button>
        </div>
      </div>`;

    document.getElementById('mg-close-btn').addEventListener('click', _closeGame);
    document.getElementById('mg-close-gameover').addEventListener('click', _closeGame);
    document.getElementById('mg-play-again').addEventListener('click', () => _startGame());
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  function _showLoading(msg) {
    const isError = msg.startsWith('⚠️');
    card.innerHTML = `
      <div class="mg-header">
        <div class="mg-title"><span class="mg-title-icon">🔍</span> Name That Stock!</div>
        <button class="mg-close" id="mg-close-btn">✕</button>
      </div>
      <div class="mg-loading">
        ${isError ? '' : '<div class="spinner"></div>'}
        <div>${msg}</div>
      </div>`;
    document.getElementById('mg-close-btn').addEventListener('click', _closeGame);
  }

  // ── DOM bootstrap ─────────────────────────────────────────────────────────
  function _ensureDOM() {
    if (document.getElementById('mg-overlay')) {
      overlay   = document.getElementById('mg-overlay');
      card      = overlay.querySelector('.mg-card');
      mascotEl  = overlay.querySelector('.mg-mascot');
      return;
    }
    overlay = document.createElement('div');
    overlay.id = 'mg-overlay';
    card = document.createElement('div');
    card.className = 'mg-card';
    overlay.appendChild(card);

    // Mascot — lives outside the card so it survives card.innerHTML rewrites
    mascotEl = document.createElement('div');
    mascotEl.className = 'mg-mascot';
    mascotEl.dataset.mood = 'idle';
    mascotEl.innerHTML = `
      <div class="mg-mascot-bubble"></div>
      <div class="mg-mascot-face">🐂</div>`;
    overlay.appendChild(mascotEl);

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) _closeGame(); });
  }

})();
