import test from 'node:test';
import assert from 'node:assert/strict';
import { createTask } from '../src/domain.js';
import { createFocusSession, finishFocusSession } from '../src/focus.js';
import { createDailyPlan, removeTaskFromDailyPlans } from '../src/daily-plan.js';
import { DAILY_PLAN_STORAGE_KEY, DAILY_PLAN_STORAGE_VERSION, FOCUS_STORAGE_KEY, FOCUS_STORAGE_VERSION, loadDailyPlans, loadFocusData, loadTasks, saveDailyPlans, saveFocusData, saveTasks, STORAGE_KEY, STORAGE_VERSION } from '../src/storage.js';

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values };
}

const task = createTask({ title: 'Review brief', notes: '', priority: 'Medium', dueDate: null, estimatedMinutes: 25 }, { id: 'task-1', now: '2026-09-24T12:00:00.000Z' });

test('saves a versioned record and restores valid tasks', () => {
  const storage = memoryStorage();
  assert.deepEqual(saveTasks(storage, [task]), { ok: true, message: '' });
  assert.deepEqual(loadTasks(storage), { tasks: [task], writable: true, message: '' });
  assert.equal(JSON.parse(storage.values.get(STORAGE_KEY)).version, STORAGE_VERSION);
});

test('preserves damaged or unsupported data by disabling editing', () => {
  const damaged = loadTasks(memoryStorage({ [STORAGE_KEY]: '{not json' }));
  const unsupported = loadTasks(memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 99, tasks: [] }) }));
  assert.equal(damaged.writable, false);
  assert.match(damaged.message, /damaged/);
  assert.equal(unsupported.writable, false);
  assert.match(unsupported.message, /unsupported/);
});

test('skips invalid records without overwriting valid stored data', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: STORAGE_VERSION, tasks: [task, { ...task, id: 'task-1' }, { id: 'bad' }] }) });
  const loaded = loadTasks(storage);
  assert.deepEqual(loaded.tasks, [task]);
  assert.equal(loaded.writable, false);
  assert.match(loaded.message, /invalid or duplicate/);
});

test('reports storage write failures', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(saveTasks(storage, [task]), { ok: false, message: 'Could not save to this browser. Storage may be full or blocked. No changes were applied. Your form is kept open so you can retry.' });
});

test('saves and restores an active focus session with retained history', () => {
  const storage = memoryStorage();
  const active = createFocusSession(task, 25, { id: 'focus-1', now: '2026-09-24T12:00:00.000Z' });
  const previous = createFocusSession(task, 25, { id: 'focus-0', now: '2026-09-24T11:00:00.000Z' });
  const history = [finishFocusSession(previous, 'finishedEarly', '2026-09-24T11:05:00.000Z')];
  assert.deepEqual(saveFocusData(storage, active, history), { ok: true, message: '' });
  assert.deepEqual(loadFocusData(storage), { activeSession: active, history, writable: true, message: '' });
  assert.equal(JSON.parse(storage.values.get(FOCUS_STORAGE_KEY)).version, FOCUS_STORAGE_VERSION);
  assert.deepEqual(saveFocusData(storage, active, [finishFocusSession(active, 'cancelled', '2026-09-24T12:05:00.000Z')]), { ok: false, message: 'These focus sessions could not be saved because their records are duplicated. No changes were applied.' });
});

test('preserves damaged focus data by disabling focus controls', () => {
  const damaged = loadFocusData(memoryStorage({ [FOCUS_STORAGE_KEY]: '{not json' }));
  const invalid = loadFocusData(memoryStorage({ [FOCUS_STORAGE_KEY]: JSON.stringify({ version: FOCUS_STORAGE_VERSION, activeSession: null, history: [{ id: 'bad' }] }) }));
  assert.equal(damaged.writable, false);
  assert.match(damaged.message, /damaged/);
  assert.equal(invalid.writable, false);
  assert.match(invalid.message, /invalid/);
});

test('saves dated daily plans and preserves invalid plan data without overwriting it', () => {
  const storage = memoryStorage();
  const plan = createDailyPlan({ date: '2026-10-03', taskIds: [task.id], budgetMinutes: 120 });
  assert.deepEqual(saveDailyPlans(storage, [plan]), { ok: true, message: '' });
  assert.deepEqual(loadDailyPlans(storage), { plans: [plan], writable: true, message: '' });
  assert.equal(JSON.parse(storage.values.get(DAILY_PLAN_STORAGE_KEY)).version, DAILY_PLAN_STORAGE_VERSION);
  const invalid = loadDailyPlans(memoryStorage({ [DAILY_PLAN_STORAGE_KEY]: JSON.stringify({ version: DAILY_PLAN_STORAGE_VERSION, plans: [plan, { ...plan }] }) }));
  assert.equal(invalid.writable, false);
  assert.match(invalid.message, /duplicate/);
});

test('persists plans without a deleted task ID while retaining other planned-task order', () => {
  const storage = memoryStorage();
  const otherTask = createTask({ title: 'Prepare notes', notes: '', priority: 'Low', dueDate: null, estimatedMinutes: 15 }, { id: 'task-2', now: '2026-09-24T12:00:00.000Z' });
  const plans = [
    createDailyPlan({ date: '2026-10-03', taskIds: [task.id, otherTask.id], budgetMinutes: 120 }),
    createDailyPlan({ date: '2026-10-04', taskIds: [otherTask.id, task.id], budgetMinutes: 90 })
  ];

  const cleanedPlans = removeTaskFromDailyPlans(plans, task.id);
  assert.deepEqual(saveDailyPlans(storage, cleanedPlans), { ok: true, message: '' });
  assert.deepEqual(loadDailyPlans(storage).plans, [
    { date: '2026-10-03', taskIds: [otherTask.id], budgetMinutes: 120 },
    { date: '2026-10-04', taskIds: [otherTask.id], budgetMinutes: 90 }
  ]);
});

test('reports daily-plan storage write failures', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('blocked'); } };
  const plan = createDailyPlan({ date: '2026-10-03', taskIds: [], budgetMinutes: 120 });
  assert.deepEqual(saveDailyPlans(storage, [plan]), { ok: false, message: 'Could not save daily plans to this browser. Storage may be full or blocked. No changes were applied.' });
});
