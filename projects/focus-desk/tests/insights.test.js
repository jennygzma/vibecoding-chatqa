import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultInsightsRange, downloadInsightsCsv, formatInsightsDuration, formatInsightsPercentage, insightsCsv, summarizeFocusHistory } from '../src/insights.js';

const history = [
  { id: 'one', taskId: 'task-a', taskTitle: 'Draft, review "notes"', focusedMilliseconds: 1_500_000, endedAt: '2026-09-20T16:30:00.000Z' },
  { id: 'two', taskId: 'task-a', taskTitle: 'Draft, review "notes"', focusedMilliseconds: 600_000, endedAt: '2026-09-22T14:00:00.000Z' },
  { id: 'three', taskId: 'task-b', taskTitle: 'Send update', focusedMilliseconds: 900_000, endedAt: '2026-09-24T23:30:00.000Z' },
  { id: 'outside', taskId: 'task-c', taskTitle: 'Outside range', focusedMilliseconds: 1_200_000, endedAt: '2026-09-25T16:01:00.000Z' }
];

test('uses the inclusive local end-date range and aggregates actual focused time by task', () => {
  const summary = summarizeFocusHistory(history, { startDate: '2026-09-20', endDate: '2026-09-24' });
  assert.equal(summary.focusedMilliseconds, 3_000_000);
  assert.equal(summary.sessionCount, 3);
  assert.deepEqual(summary.tasks, [
    { taskId: 'task-a', taskTitle: 'Draft, review "notes"', focusedMilliseconds: 2_100_000, sessionCount: 2 },
    { taskId: 'task-b', taskTitle: 'Send update', focusedMilliseconds: 900_000, sessionCount: 1 }
  ]);
  assert.equal(formatInsightsDuration(summary.focusedMilliseconds), '50m 0s');
  assert.equal(formatInsightsPercentage(summary.tasks[0].focusedMilliseconds, summary.focusedMilliseconds), '70%');
});

test('returns a clear zero summary for an empty selected range', () => {
  const summary = summarizeFocusHistory(history, { startDate: '2026-08-01', endDate: '2026-08-07' });
  assert.deepEqual(summary.tasks, []);
  assert.equal(summary.focusedMilliseconds, 0);
  assert.equal(summary.sessionCount, 0);
  assert.equal(formatInsightsPercentage(0, 0), '0%');
});

test('uses seven inclusive local calendar days and rejects backwards ranges', () => {
  assert.deepEqual(defaultInsightsRange(new Date(2026, 8, 24, 21)), { startDate: '2026-09-18', endDate: '2026-09-24' });
  assert.throws(() => summarizeFocusHistory(history, { startDate: '2026-09-25', endDate: '2026-09-24' }), /start date/);
});

test('exports the selected range and safely escapes commas and quotes in task names', () => {
  const summary = summarizeFocusHistory(history, { startDate: '2026-09-20', endDate: '2026-09-24' });
  assert.equal(insightsCsv(summary), '"Start date","End date","Task name","Focused milliseconds","Focused time","Session count"\r\n"2026-09-20","2026-09-24","Draft, review ""notes""","2100000","35m 0s","2"\r\n"2026-09-20","2026-09-24","Send update","900000","15m 0s","1"\r\n');
});

test('keeps the Blob URL available while the browser starts the requested CSV download', () => {
  const summary = summarizeFocusHistory(history, { startDate: '2026-09-20', endDate: '2026-09-24' });
  const link = { clickCount: 0, removeCount: 0, click() { this.clickCount += 1; }, remove() { this.removeCount += 1; } };
  const revoked = [];
  const scheduled = [];
  const appended = [];
  downloadInsightsCsv(summary, {
    Blob: class { constructor(parts, options) { this.parts = parts; this.options = options; } },
    document: { body: { append: element => appended.push(element) }, createElement: () => link },
    setTimeout: (callback, delay) => scheduled.push({ callback, delay }),
    URL: { createObjectURL: blob => { assert.match(blob.parts[0], /Draft, review ""notes""/); return 'blob:focus-export'; }, revokeObjectURL: url => revoked.push(url) }
  });
  assert.equal(link.download, 'focus-insights-2026-09-20-to-2026-09-24.csv');
  assert.equal(link.clickCount, 1);
  assert.deepEqual(appended, [link]);
  assert.equal(link.removeCount, 1);
  assert.deepEqual(revoked, []);
  assert.deepEqual(scheduled.map(timer => timer.delay), [60_000]);
  scheduled[0].callback();
  assert.deepEqual(revoked, ['blob:focus-export']);
});

test('releases the Blob URL immediately when the CSV download request fails', () => {
  const summary = summarizeFocusHistory(history, { startDate: '2026-09-20', endDate: '2026-09-24' });
  const link = { click() { throw new Error('blocked'); }, removeCount: 0, remove() { this.removeCount += 1; } };
  const revoked = [];
  assert.throws(() => downloadInsightsCsv(summary, {
    Blob: class { constructor() {} },
    document: { body: { append() {} }, createElement: () => link },
    setTimeout: () => assert.fail('failed downloads must not schedule delayed cleanup'),
    URL: { createObjectURL: () => 'blob:failed-export', revokeObjectURL: url => revoked.push(url) }
  }), /blocked/);
  assert.equal(link.removeCount, 1);
  assert.deepEqual(revoked, ['blob:failed-export']);
});
