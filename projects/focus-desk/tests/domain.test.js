import test from 'node:test';
import assert from 'node:assert/strict';
import { createTask, editTask, filterTasks, formatDueDate, isLocalDate, setTaskCompleted, validateInput } from '../src/domain.js';

const input = { title: ' Draft plan ', notes: 'First outline', priority: 'High', dueDate: '2026-10-03', estimatedMinutes: 45 };

test('creates a normalized task with complete metadata', () => {
  const task = createTask(input, { id: 'task-1', now: '2026-09-24T12:00:00.000Z' });
  assert.deepEqual(task, { id: 'task-1', title: 'Draft plan', notes: 'First outline', priority: 'High', dueDate: '2026-10-03', estimatedMinutes: 45, completed: false, createdAt: '2026-09-24T12:00:00.000Z', updatedAt: '2026-09-24T12:00:00.000Z' });
});

test('validates required and bounded task fields', () => {
  const result = validateInput({ title: '', notes: 'x'.repeat(2001), priority: 'Urgent', dueDate: '2026-02-29', estimatedMinutes: 4 });
  assert.deepEqual(Object.keys(result.errors).sort(), ['dueDate', 'estimatedMinutes', 'notes', 'priority', 'title']);
  assert.equal(isLocalDate('2024-02-29'), true);
  assert.equal(isLocalDate('2026-02-29'), false);
});

test('edits and changes completion without losing task identity', () => {
  const original = createTask(input, { id: 'task-2', now: '2026-09-24T12:00:00.000Z' });
  const edited = editTask(original, { ...input, title: 'Revised plan', priority: 'Low' }, '2026-09-25T12:00:00.000Z');
  const completed = setTaskCompleted(edited, true, '2026-09-26T12:00:00.000Z');
  assert.equal(completed.id, 'task-2');
  assert.equal(completed.createdAt, original.createdAt);
  assert.equal(completed.title, 'Revised plan');
  assert.equal(completed.completed, true);
  assert.equal(completed.updatedAt, '2026-09-26T12:00:00.000Z');
});

test('searches titles and combines status and priority filters', () => {
  const tasks = [
    createTask(input, { id: '1', now: '2026-09-24T12:00:00.000Z' }),
    { ...createTask({ ...input, title: 'Read brief', priority: 'Low' }, { id: '2', now: '2026-09-24T12:00:00.000Z' }), completed: true },
    createTask({ ...input, title: 'Draft email', priority: 'Medium' }, { id: '3', now: '2026-09-24T12:00:00.000Z' })
  ];
  assert.deepEqual(filterTasks(tasks, { search: 'DRAFT', status: 'open', priority: 'Medium' }).map(task => task.id), ['3']);
  assert.deepEqual(filterTasks(tasks, { status: 'completed' }).map(task => task.id), ['2']);
  assert.equal(formatDueDate('2026-10-03'), 'Oct 3, 2026');
});
