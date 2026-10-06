const LABELS = ['single-session', 'multi-session', 'singlehop', 'multihop', 'preference', 'temporal', 'knowledge-facts', 'open-domain'];
const DECISIONS = ['unreviewed', 'approved', 'needs-edit', 'rejected'];
const STORAGE_KEY = 'michael-full-reevaluation-review-v3';
const state = {data:null, projectId:null, itemId:null, reviews:{}};
const $ = id => document.getElementById(id);
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const project = () => state.data?.projects.find(p => p.id === state.projectId);
const current = () => project()?.items.find(i => i.id === state.itemId);
const review = item => state.reviews[item.id] || {decision:'unreviewed', notes:'', qa:structuredClone(item.qa)};

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.reviews)); }
  catch { $('error').textContent = 'Browser storage is unavailable. Export a review backup before closing.'; }
}

function validate(item, qa) {
  if (!qa.question?.trim().endsWith('?') || !qa.answer?.trim()) throw Error('Provide a question ending in ? and a nonempty answer.');
  const labels = qa.category;
  if (!Array.isArray(labels) || labels.some(c => !LABELS.includes(c)) || new Set(labels).size !== labels.length) throw Error('Use only the eight unique category labels.');
  if (JSON.stringify(qa.evidence) !== JSON.stringify(item.qa.evidence)) throw Error('Evidence changed. Source edits require a separate provenance review.');
  const sessions = new Set(qa.evidence.map(e => e.match(/^(D\d+):/)[1]));
  const scope = sessions.size > 1 ? 'multi-session' : 'single-session';
  if (!labels.includes(scope) || labels.includes(scope === 'multi-session' ? 'single-session' : 'multi-session')) throw Error(`Evidence requires ${scope}.`);
  const hops = labels.filter(c => ['singlehop', 'multihop'].includes(c));
  if (labels.includes('open-domain') ? hops.length : hops.length !== 1) throw Error('Choose one hop label, or open-domain without a hop label.');
  if (scope === 'multi-session' && !labels.includes('multihop')) throw Error('This cross-session set requires multihop.');
}

function persist() {
  const item = current();
  if (!item) return;
  const previous = review(item);
  const qa = {question:$('question').value.trim(), answer:$('answer').value.trim(),
    category:[...$('categories').querySelectorAll('input:checked')].map(input => input.value), evidence:item.qa.evidence};
  // Preserve the canonical ordering for existing labels; checking a category
  // must not manufacture an edit merely through object/label ordering.
  qa.category = [...item.qa.category.filter(c => qa.category.includes(c)), ...qa.category.filter(c => !item.qa.category.includes(c))];
  const edited = ['question', 'answer', 'category', 'evidence'].some(k => JSON.stringify(qa[k]) !== JSON.stringify(previous.qa[k]));
  state.reviews[item.id] = {...previous, qa, notes:$('notes').value.trim(), updatedAt:new Date().toISOString(),
    decision:edited && previous.decision === 'approved' ? 'needs-edit' : previous.decision};
  save();
  $('status').textContent = state.reviews[item.id].decision;
}

function filtered() {
  return project().items.filter(item => {
    const group = $('group').value;
    const sessions = [...new Set(item.qa.evidence.map(e => e.match(/^(D\d+):/)[1]))];
    return (group === 'all' || (group === 'cross' ? sessions.length > 1 : sessions.length === 1 && sessions[0] === group))
      && ($('revision').value === 'all' || item.audit.disposition === $('revision').value)
      && ($('decision-filter').value === 'all' || review(item).decision === $('decision-filter').value);
  });
}

function renderProjects() {
  $('projects').innerHTML = state.data.projects.map(p => {
    const approved = p.items.filter(i => review(i).decision === 'approved').length;
    return `<button data-project="${p.id}" class="${p.id === state.projectId ? 'active' : ''}"><strong>${escapeHTML(p.title)}</strong><small>${p.items.length} questions · ${p.categories.counts['multi-session']} multi-session · ${approved} approved</small></button>`;
  }).join('');
  $('projects').querySelectorAll('button').forEach(button => button.onclick = () => {
    persist(); state.projectId = button.dataset.project;
    $('group').value = 'all'; $('revision').value = 'all'; $('decision-filter').value = 'all';
    setGroups(); state.itemId = project().items.find(i => review(i).decision === 'unreviewed')?.id || project().items[0].id; render();
  });
}

function setGroups() {
  $('group').innerHTML = '<option value="all">All sessions</option><option value="cross">Multi-session</option>' + project().sessions.map(s => `<option value="${s.session_label}">${escapeHTML(s.session_label + ' · ' + s.feature)}</option>`).join('');
}

function renderPublicationStatus() {
  const approval = state.data.human_review;
  const approved = state.data.status === 'human-approved' && approval?.status === 'human-approved';
  const count = state.data.projects.reduce((n, p) => n + p.items.length, 0);
  $('publication-status').textContent = approved
    ? `Published set: ${count} human-approved questions · review exported ${approval.exported_at}. Working decisions below are saved in this browser.`
    : 'Published set: human approval pending. Working decisions below are saved in this browser.';
  $('saved-review').hidden = !approved;
  if (approved) $('saved-review').href = '../../' + approval.path;
}

function render() {
  renderProjects();
  const rows = filtered();
  if (!rows.some(i => i.id === state.itemId)) state.itemId = rows[0]?.id || null;
  const approved = project().items.filter(i => review(i).decision === 'approved').length;
  const decided = project().items.filter(i => review(i).decision !== 'unreviewed').length;
  $('progress').textContent = `${approved}/${project().items.length} approved · ${decided} decided · ${rows.length} shown`;
  $('queue').innerHTML = rows.map(item => `<button data-item="${item.id}" class="${item.id === state.itemId ? 'active' : ''}"><span class="dot ${review(item).decision}"></span><span><strong>${item.questionId} · ${item.audit.disposition}</strong><br>${escapeHTML(review(item).qa.question)}</span></button>`).join('');
  $('queue').querySelectorAll('button').forEach(button => button.onclick = () => {persist(); state.itemId = button.dataset.item; render();});
  const item = current();
  $('fields').hidden = !item; $('empty').hidden = !!item;
  $('evidence').innerHTML = ''; $('error').textContent = '';
  if (!item) { $('item-id').textContent = ''; $('status').textContent = ''; return; }
  const r = review(item);
  $('item-id').textContent = `${project().title} · ${item.questionId} · ${item.audit.disposition}`;
  $('status').textContent = r.decision;
  $('question').value = r.qa.question; $('answer').value = r.qa.answer; $('notes').value = r.notes || '';
  $('categories').innerHTML = LABELS.map(c => `<label><input type="checkbox" value="${c}" ${r.qa.category.includes(c) ? 'checked' : ''}>${c}</label>`).join('');
  $('reason').textContent = item.review.category_reason;
  $('necessity').textContent = item.review.cross_session_necessity ? `Why both sessions are needed: ${item.review.cross_session_necessity}` : '';
  $('previous').textContent = item.previous ? 'Previous version:\n' + JSON.stringify(item.previous, null, 2) : 'New question; no previous version.';
  $('evidence').innerHTML = item.qa.evidence.map(e => {
    const match = e.match(/^(D\d+):(\d+): "([\s\S]+)"$/);
    const dia = `${match[1]}:${match[2]}`;
    const message = project().sample.conversation[`session_${match[1].slice(1)}`].find(m => m.dia_id === dia);
    return `<article class="source-card"><div class="meta">${dia} · ${message.role}</div><blockquote>${escapeHTML(match[3])}</blockquote><details><summary>Full original message</summary><div class="full-message">${escapeHTML(message.text)}</div></details></article>`;
  }).join('');
}

function navigate(delta) {
  persist(); const rows = filtered(); const index = rows.findIndex(i => i.id === state.itemId);
  state.itemId = rows[Math.max(0, Math.min(rows.length - 1, index + delta))]?.id || null; render();
}

function decide(decision) {
  const item = current(); if (!item) return;
  const rows = filtered(); const index = rows.findIndex(i => i.id === item.id);
  persist();
  try { if (decision === 'approved') validate(item, review(item).qa); }
  catch(error) { $('error').textContent = error.message; return; }
  state.reviews[item.id].decision = decision; save();
  const next = rows.slice(index + 1).find(i => review(i).decision === 'unreviewed') || rows.find(i => review(i).decision === 'unreviewed');
  if (next) state.itemId = next.id;
  render();
}

function reviewExport() {
  const projects = state.data.projects.map(p => {
    const rows = p.items.map(item => ({id:item.id, questionId:item.questionId, ...review(item)}));
    const complete = rows.every(r => r.decision === 'approved');
    if (complete) rows.forEach((row, index) => validate(p.items[index], row.qa));
    return {project:p.id, sourceRevision:p.revision, complete, rows,
      approvedCombined:complete ? [{...p.sample, qa:rows.map(r => r.qa)}] : null};
  });
  return {format:'michael-review-v3', exportedAt:new Date().toISOString(), projects};
}

function exportReview() {
  persist();
  let value;
  try {value = reviewExport();} catch(error) {$('error').textContent = error.message; return;}
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], {type:'application/json'});
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = 'michael-annotation-review.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importReview(file) {
  if (!file) return;
  const value = JSON.parse(await file.text());
  if (value.format !== 'michael-review-v3' || !Array.isArray(value.projects)) throw Error('Not a current v3 review export.');
  const staged = {};
  for (const p of value.projects) {
    const base = state.data.projects.find(base => base.id === p.project);
    if (!base || base.revision !== p.sourceRevision) throw Error('Review belongs to a different dataset revision.');
    const seen = new Set();
    for (const row of p.rows) {
      const item = base.items.find(i => i.id === row.id);
      if (!item || seen.has(row.id) || !DECISIONS.includes(row.decision)) throw Error('Unknown, repeated, or malformed review row.');
      seen.add(row.id);
      if (row.decision === 'approved') validate(item, row.qa);
      staged[row.id] = {decision:row.decision, notes:String(row.notes || ''), qa:row.qa, updatedAt:row.updatedAt};
    }
  }
  state.reviews = {...state.reviews, ...staged}; save(); render();
}

$('approve').onclick = () => decide('approved'); $('edit').onclick = () => decide('needs-edit'); $('reject').onclick = () => decide('rejected');
$('prev').onclick = () => navigate(-1); $('next').onclick = () => navigate(1);
for (const id of ['group', 'revision', 'decision-filter']) $(id).onchange = () => {persist(); state.itemId = null; render();};
for (const id of ['question', 'answer', 'notes']) $(id).addEventListener('input', persist);
$('categories').addEventListener('change', () => {persist(); $('status').textContent = review(current()).decision;});
$('export').onclick = exportReview; $('import').onclick = () => $('import-file').click();
$('import-file').onchange = async event => {try {await importReview(event.target.files[0]);} catch(error) {$('error').textContent = error.message;} event.target.value = '';};
document.addEventListener('keydown', event => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  const actions = {a:() => decide('approved'), e:() => decide('needs-edit'), r:() => decide('rejected'), ArrowLeft:() => navigate(-1), ArrowRight:() => navigate(1)};
  if (actions[event.key]) {event.preventDefault(); actions[event.key]();}
});
fetch('data.json', {cache:'no-store'}).then(response => {if (!response.ok) throw Error('Review data could not load.'); return response.json();}).then(data => {
  state.data = data;
  renderPublicationStatus();
  try {state.reviews = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');} catch {state.reviews = {};}
  state.projectId = data.projects[0].id; state.itemId = data.projects[0].items[0].id;
  $('reference').href = data.reference; setGroups(); render();
}).catch(error => { $('error').textContent = `${error.message} Run python3 scripts/build_michael_review.py and serve the repository over HTTP.`; });
