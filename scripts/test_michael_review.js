// Isolated logic tests: no browser profile or real researcher decisions touched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const nodes = new Map();
const node = id => {
  if (!nodes.has(id)) nodes.set(id, {value:'', textContent:'', checked:[], addEventListener(){}, querySelectorAll(){return this.checked;}});
  return nodes.get(id);
};
const context = vm.createContext({document:{getElementById:node, addEventListener(){}},
  localStorage:{setItem(){}, getItem(){return null;}}, fetch:() => new Promise(() => {}),
  structuredClone, console, fixture:JSON.parse(fs.readFileSync(path.join(root, 'projects/annotation-review/data.json')))});
vm.runInContext(fs.readFileSync(path.join(root, 'projects/annotation-review/app.js'), 'utf8'), context);
const run = code => vm.runInContext(code, context);
run('state.data=fixture; state.projectId=fixture.projects[0].id; state.itemId=project().items[0].id;');
run('renderPublicationStatus()');
assert.match(node('publication-status').textContent, /189 human-approved questions/);
assert.equal(node('saved-review').href, '../../data/michael-annotation-review.json');
run("state.data={...fixture,status:'human-review-pending',human_review:null}; renderPublicationStatus();");
assert.match(node('publication-status').textContent, /human approval pending/);
assert.equal(node('saved-review').hidden, true);
run('state.data=fixture');
run('for (const p of fixture.projects) for (const item of p.items) validate(item,item.qa);');
assert.equal(run('fixture.projects.reduce((n,p)=>n+p.items.length,0)'), 189);
assert.equal(run('reviewExport().projects.every(p=>!p.complete && p.approvedCombined===null)'), true);
assert.throws(() => run("validate(current(),{...current().qa,category:['multi-session','multihop']})"), /requires single-session/);
assert.throws(() => run("validate(current(),{...current().qa,category:['single-session','singlehop','open-domain']})"), /hop label/);
assert.throws(() => run("validate(current(),{...current().qa,evidence:['D1:1: \"forged\"']})"), /Evidence changed/);
const first = run('current()');
node('question').value = first.qa.question;
node('answer').value = first.qa.answer;
node('notes').value = 'test only';
node('categories').checked = [...first.qa.category].reverse().map(value => ({value}));
run("state.reviews[current().id]={decision:'approved',qa:structuredClone(current().qa),notes:''}; persist();");
assert.equal(run('review(current()).decision'), 'approved', 'Notes/order alone must not invalidate approval');
node('answer').value += ' Edited.';
run('persist()');
assert.equal(run('review(current()).decision'), 'needs-edit', 'Edited approved QA must require review again');
node('group').value = 'cross'; node('revision').value = 'all'; node('decision-filter').value = 'all';
assert.equal(run('filtered().length'), 14);
run("for(const p of fixture.projects) for(const item of p.items) state.reviews[item.id]={decision:'approved',qa:structuredClone(item.qa),notes:''};");
assert.equal(run('reviewExport().projects.every(p=>p.complete && p.approvedCombined[0].qa.length===p.rows.length)'), true);
(async () => {
  const stale = run('reviewExport()'); stale.projects[0].sourceRevision = 'wrong'; context.stale = stale;
  await assert.rejects(run('importReview({text:async()=>JSON.stringify(stale)})'), /different dataset revision/);
  const unknown = run('reviewExport()'); unknown.projects[0].rows[0].id = 'old-approval'; context.unknown = unknown;
  await assert.rejects(run('importReview({text:async()=>JSON.stringify(unknown)})'), /Unknown/);
  console.log('Review tests passed: all 189 QA valid, scope/hop/evidence guards, no inherited approval, edit invalidation, cross-session filter, export completeness, stale import rejection.');
})().catch(error => {console.error(error); process.exitCode=1;});
