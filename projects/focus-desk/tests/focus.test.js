import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkpointFocusSession,
  createFocusSession,
  finishFocusSession,
  focusProgress,
  formatFocusDuration,
  pauseFocusSession,
  recoverFocusSession,
  resumeFocusSession
} from '../src/focus.js';

const task = { id: 'task-1', title: 'Write project brief' };
const startedAt = '2026-09-24T12:00:00.000Z';

test('starts a 25-minute session and only counts its running elapsed time', () => {
  const session = createFocusSession(task, 25, { id: 'focus-1', now: startedAt });
  assert.equal(session.durationMilliseconds, 25 * 60_000);
  const checkpoint = checkpointFocusSession(session, '2026-09-24T12:03:12.500Z');
  assert.deepEqual(focusProgress(checkpoint, '2026-09-24T12:03:12.500Z'), { focusedMilliseconds: 192500, remainingMilliseconds: 1307500, complete: false });
  assert.equal(formatFocusDuration(192500), '3m 12s');
});

test('pauses and resumes without counting the paused interval', () => {
  const session = createFocusSession(task, 25, { id: 'focus-2', now: startedAt });
  const paused = pauseFocusSession(session, '2026-09-24T12:04:00.000Z');
  assert.equal(paused.status, 'paused');
  assert.equal(paused.focusedMilliseconds, 240000);
  assert.equal(focusProgress(paused, '2026-09-24T12:15:00.000Z').focusedMilliseconds, 240000);
  const resumed = resumeFocusSession(paused, '2026-09-24T12:15:00.000Z');
  assert.equal(focusProgress(resumed, '2026-09-24T12:17:30.000Z').focusedMilliseconds, 390000);
});

test('reload recovery deliberately pauses a running session without adding reload time', () => {
  const session = createFocusSession(task, 25, { id: 'focus-3', now: startedAt });
  const checkpoint = checkpointFocusSession(session, '2026-09-24T12:02:00.000Z');
  const recovered = recoverFocusSession(checkpoint);
  assert.deepEqual(recovered, { ...checkpoint, status: 'paused', lastResumedAt: null });
  assert.equal(focusProgress(recovered, '2026-09-24T14:02:00.000Z').focusedMilliseconds, 120000);
});

test('captures the task title at early finish, cancellation, and automatic completion', () => {
  const session = createFocusSession({ ...task, title: 'Snapshot before' }, 25, { id: 'focus-4', now: startedAt });
  const titleAtEnd = 'Snapshot at end';
  const early = finishFocusSession(session, 'finishedEarly', '2026-09-24T12:06:07.000Z', titleAtEnd);
  const cancelled = finishFocusSession(session, 'cancelled', '2026-09-24T12:01:03.000Z', titleAtEnd);
  const completed = finishFocusSession(session, 'completed', '2026-09-24T12:25:00.000Z', titleAtEnd);
  assert.equal(early.taskTitle, titleAtEnd);
  assert.equal(early.focusedMilliseconds, 367000);
  assert.equal(cancelled.outcome, 'cancelled');
  assert.equal(cancelled.taskTitle, titleAtEnd);
  assert.equal(cancelled.focusedMilliseconds, 63000);
  assert.equal(completed.taskTitle, titleAtEnd);
});

test('uses the stored task title after deletion and preserves a finished snapshot after later renames', () => {
  const session = createFocusSession({ ...task, title: 'Snapshot before' }, 25, { id: 'focus-deleted-task', now: startedAt });
  let currentTask = { ...task, title: 'Snapshot at end' };
  const finished = finishFocusSession(session, 'finishedEarly', '2026-09-24T12:02:00.000Z', currentTask.title);
  currentTask = { ...currentTask, title: 'Snapshot after' };
  const finishedAfterDeletion = finishFocusSession(session, 'cancelled', '2026-09-24T12:03:00.000Z');
  assert.equal(currentTask.title, 'Snapshot after');
  assert.equal(finished.taskTitle, 'Snapshot at end');
  assert.equal(finishedAfterDeletion.taskTitle, 'Snapshot before');
});

test('records a completed session at its full duration', () => {
  const session = createFocusSession(task, 25, { id: 'focus-5', now: startedAt });
  const completed = finishFocusSession(session, 'completed', '2026-09-24T12:30:00.000Z');
  assert.equal(completed.focusedMilliseconds, 1500000);
  assert.equal(completed.outcome, 'completed');
  assert.throws(() => finishFocusSession(session, 'completed', '2026-09-24T12:05:00.000Z'), /Only a completed timer/);
});
