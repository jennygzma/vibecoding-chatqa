const STORAGE_KEY = 'stockapp-annotation-review-v1';
const CATEGORY_NAMES = { 1: 'Multi-hop', 2: 'Temporal', 3: 'Open-domain', 4: 'Single-hop', 5: 'Adversarial' };

const state = {
  data: null,
  trajectoryId: null,
  itemId: null,
  filter: 'all',
  reviews: {},
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHTML(value = '') {
  return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function loadReviews() {
  try { state.reviews = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { state.reviews = {}; }
}

function saveReviews() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reviews));
}

function allItems() {
  return state.data.trajectories.flatMap(trajectory => trajectory.items.map(item => ({ trajectory, item })));
}

function currentTrajectory() {
  return state.data.trajectories.find(row => row.id === state.trajectoryId);
}

function reviewFor(item) {
  return state.reviews[item.id] || { decision: 'unreviewed', notes: '', question: item.question, answer: item.answer, category: item.category };
}

function currentItem() {
  const trajectory = currentTrajectory();
  return trajectory?.items.find(item => item.id === state.itemId) || trajectory?.items[0];
}

function filteredItems(trajectory = currentTrajectory()) {
  if (!trajectory) return [];
  return trajectory.items.filter(item => state.filter === 'all' || reviewFor(item).decision === state.filter);
}

function progressFor(trajectory) {
  const reviewed = trajectory.items.filter(item => reviewFor(item).decision !== 'unreviewed').length;
  return { reviewed, total: trajectory.items.length, percent: trajectory.items.length ? reviewed / trajectory.items.length * 100 : 0 };
}

function updateProgress() {
  const items = allItems().map(row => row.item);
  const reviewed = items.filter(item => reviewFor(item).decision !== 'unreviewed').length;
  $('#reviewed-count').textContent = `${reviewed} / ${items.length}`;
  $('#progress-fill').style.width = `${items.length ? reviewed / items.length * 100 : 0}%`;
}

function renderTrajectories() {
  $('#trajectory-list').innerHTML = state.data.trajectories.map(trajectory => {
    const progress = progressFor(trajectory);
    return `<button class="trajectory-button ${trajectory.id === state.trajectoryId ? 'active' : ''}" data-trajectory="${trajectory.id}">
      <div class="trajectory-name">${escapeHTML(trajectory.title)}</div>
      <div class="trajectory-stats"><span>${trajectory.promptCount} prompts</span><span>${progress.reviewed}/${progress.total}</span></div>
      <div class="mini-track"><span style="width:${progress.percent}%"></span></div>
    </button>`;
  }).join('');
  $$('.trajectory-button').forEach(button => button.addEventListener('click', () => selectTrajectory(button.dataset.trajectory)));
}

function renderQueue() {
  const items = filteredItems();
  $('#queue-count').textContent = items.length;
  $('#annotation-queue').innerHTML = items.length ? items.map(item => {
    const review = reviewFor(item);
    return `<button class="queue-item ${item.id === state.itemId ? 'active' : ''}" data-item="${item.id}">
      <span class="queue-number">${item.position}</span>
      <span class="queue-question">${escapeHTML(review.question)}</span>
      <span class="status-dot ${review.decision}"></span>
    </button>`;
  }).join('') : '<div class="queue-empty">No annotations match this filter.</div>';
  $$('.queue-item').forEach(button => button.addEventListener('click', () => selectItem(button.dataset.item)));
}

function renderItem() {
  const trajectory = currentTrajectory();
  const item = currentItem();
  if (!trajectory || !item) return;
  state.itemId = item.id;
  const review = reviewFor(item);
  $('#trajectory-title').textContent = trajectory.title;
  $('#item-counter').textContent = `Item ${item.position} of ${trajectory.items.length}`;
  $('#annotation-id').textContent = item.id;
  $('#question-input').value = review.question;
  $('#answer-input').value = review.answer;
  $('#category-input').value = String(review.category);
  $('#notes-input').value = review.notes || '';
  const pill = $('#decision-pill');
  pill.className = `decision-pill ${review.decision}`;
  pill.textContent = review.decision.replace('-', ' ');
  $('#evidence-list').innerHTML = item.sources.map(source => `<article class="evidence-card">
    <div class="evidence-top"><span class="source-id">D1:${source.index}</span><span class="source-role">${source.role}</span></div>
    <p class="quote">“${escapeHTML(source.quote)}”</p>
    <details class="source-details"><summary>Show full source message</summary><div class="source-full">${escapeHTML(source.fullText)}</div></details>
  </article>`).join('');
  renderQueue();
}

function render() {
  renderTrajectories();
  renderItem();
  updateProgress();
}

function selectTrajectory(id) {
  state.trajectoryId = id;
  const items = filteredItems(currentTrajectory());
  state.itemId = items[0]?.id || currentTrajectory().items[0]?.id;
  render();
}

function selectItem(id) {
  state.itemId = id;
  renderItem();
}

function persistEdits() {
  const item = currentItem();
  if (!item) return;
  const previous = reviewFor(item);
  state.reviews[item.id] = {
    ...previous,
    question: $('#question-input').value.trim(),
    answer: $('#answer-input').value.trim(),
    category: Number($('#category-input').value),
    notes: $('#notes-input').value.trim(),
    updatedAt: new Date().toISOString(),
  };
  saveReviews();
}

function setDecision(decision, moveNext = false) {
  persistEdits();
  const item = currentItem();
  state.reviews[item.id].decision = decision;
  state.reviews[item.id].updatedAt = new Date().toISOString();
  saveReviews();
  showToast(decision === 'approved' ? 'Approved' : decision === 'rejected' ? 'Rejected' : 'Marked for editing');
  if (moveNext) navigate(1, true); else render();
}

function navigate(delta, preferUnreviewed = false) {
  persistEdits();
  const trajectory = currentTrajectory();
  let items = filteredItems(trajectory);
  if (!items.length) items = trajectory.items;
  let index = items.findIndex(item => item.id === state.itemId);
  if (preferUnreviewed) {
    const next = trajectory.items.find((item, i) => i > currentItem().position - 1 && reviewFor(item).decision === 'unreviewed')
      || trajectory.items.find(item => reviewFor(item).decision === 'unreviewed');
    if (next) { state.itemId = next.id; render(); return; }
  }
  index = index < 0 ? 0 : (index + delta + items.length) % items.length;
  state.itemId = items[index].id;
  render();
}

function nextUnreviewed() {
  persistEdits();
  const match = allItems().find(({ item }) => reviewFor(item).decision === 'unreviewed');
  if (!match) { showToast('Everything has a decision'); return; }
  state.trajectoryId = match.trajectory.id;
  state.itemId = match.item.id;
  state.filter = 'all';
  syncFilterButtons();
  render();
}

function syncFilterButtons() {
  $$('#status-filter button').forEach(button => button.classList.toggle('active', button.dataset.filter === state.filter));
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1400);
}

function download(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function exportReview() {
  persistEdits();
  const decisions = allItems().map(({ trajectory, item }) => ({ trajectory: trajectory.id, itemId: item.id, ...reviewFor(item) }));
  const approved = {};
  state.data.trajectories.forEach(trajectory => {
    approved[trajectory.id] = {
      qa: trajectory.items.filter(item => reviewFor(item).decision === 'approved').map(item => {
        const review = reviewFor(item);
        return { question: review.question, answer: review.answer, evidence: item.evidence, category: review.category };
      }),
    };
  });
  download('stockapp-annotation-review.json', {
    format: 'stockapp-annotation-review-v1',
    exportedAt: new Date().toISOString(),
    decisions,
    approved,
  });
  showToast('Review exported');
}

function importReview(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      if (!Array.isArray(payload.decisions)) throw new Error('No decisions array');
      state.reviews = Object.fromEntries(payload.decisions.map(decision => [decision.itemId, decision]));
      saveReviews();
      render();
      showToast('Review imported');
    } catch { showToast('Could not import this file'); }
  };
  reader.readAsText(file);
}

function registerWebMCP() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const register = tool => Promise.resolve(context.registerTool(tool)).catch(() => {});
  register({
    name: 'get_annotation_review_progress',
    title: 'Get annotation review progress',
    description: 'Return counts for reviewed and unreviewed StockApp annotation candidates.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() {
      const items = allItems().map(row => row.item);
      const counts = { approved: 0, rejected: 0, needsEdit: 0, unreviewed: 0 };
      items.forEach(item => { const d = reviewFor(item).decision; counts[d === 'needs-edit' ? 'needsEdit' : d] += 1; });
      return { total: items.length, ...counts };
    },
  });
  register({
    name: 'set_annotation_review_decision',
    title: 'Set annotation review decision',
    description: 'Approve, reject, or flag one visible StockApp annotation candidate for editing.',
    inputSchema: {
      type: 'object',
      properties: {
        itemId: { type: 'string' },
        decision: { type: 'string', enum: ['approved', 'rejected', 'needs-edit'] },
        notes: { type: 'string' },
      },
      required: ['itemId', 'decision'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      const match = allItems().find(row => row.item.id === input.itemId);
      if (!match) throw new Error('Unknown annotation item');
      const current = reviewFor(match.item);
      state.reviews[input.itemId] = { ...current, decision: input.decision, notes: input.notes || current.notes, updatedAt: new Date().toISOString() };
      saveReviews();
      render();
      return { itemId: input.itemId, decision: input.decision };
    },
  });
}

async function init() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error('Data failed to load');
    state.data = await response.json();
    loadReviews();
    state.trajectoryId = state.data.trajectories[0].id;
    state.itemId = state.data.trajectories[0].items[0].id;
    $('#loading').remove();
    $('#app').hidden = false;
    render();
    registerWebMCP();
  } catch (error) {
    $('#loading').textContent = `Could not load annotation data: ${error.message}`;
  }
}

$$('.decision').forEach(button => button.addEventListener('click', () => setDecision(button.dataset.decision, button.dataset.decision === 'approved')));
$('#previous-item').addEventListener('click', () => navigate(-1));
$('#next-item').addEventListener('click', () => navigate(1));
$('#next-unreviewed').addEventListener('click', nextUnreviewed);
$('#export-button').addEventListener('click', exportReview);
$('#import-button').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', event => event.target.files[0] && importReview(event.target.files[0]));
$('#status-filter').addEventListener('click', event => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  persistEdits();
  state.filter = button.dataset.filter;
  syncFilterButtons();
  const items = filteredItems();
  if (items.length) state.itemId = items[0].id;
  renderItem();
});
['question-input', 'answer-input', 'category-input', 'notes-input'].forEach(id => $(`#${id}`).addEventListener('change', persistEdits));
document.addEventListener('keydown', event => {
  const editing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (editing || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.key.toLowerCase() === 'a') setDecision('approved', true);
  else if (event.key.toLowerCase() === 'e') setDecision('needs-edit');
  else if (event.key.toLowerCase() === 'r') setDecision('rejected');
  else if (event.key === 'ArrowLeft') navigate(-1);
  else if (event.key === 'ArrowRight') navigate(1);
});

init();
