import test from 'node:test';
import assert from 'node:assert/strict';
import { createTask, setTaskCompleted } from '../src/domain.js';
import { createDailyPlan, dailyPlanSummary, isDailyPlanRecord, validateDailyPlan } from '../src/daily-plan.js';

const timestamp = '2026-09-24T12:00:00.000Z';
const write = createTask({ title: 'Write brief', notes: '', priority: 'High', dueDate: null, estimatedMinutes: 45 }, { id: 'write', now: timestamp });
const review = createTask({ title: 'Review brief', notes: '', priority: 'Medium', dueDate: null, estimatedMinutes: 30 }, { id: 'review', now: timestamp });

test('creates a dated plan with an ordered task selection and a 120-minute default budget', () => {
  const plan = createDailyPlan({ date: '2026-10-03', taskIds: ['review', 'write'] });
  assert.deepEqual(plan, { date: '2026-10-03', taskIds: ['review', 'write'], budgetMinutes: 120 });
  assert.equal(isDailyPlanRecord(plan), true);
});

test('rejects invalid plan dates, duplicate tasks, and out-of-range budgets', () => {
  const result = validateDailyPlan({ date: '2026-02-29', taskIds: ['write', 'write'], budgetMinutes: 1441 });
  assert.deepEqual(Object.keys(result.errors).sort(), ['budgetMinutes', 'date', 'taskIds']);
  assert.throws(() => createDailyPlan({ date: '2026-10-03', taskIds: [], budgetMinutes: 4 }), /whole number/);
});

test('calculates workload, over-budget time, and task completion from current tasks', () => {
  const plan = createDailyPlan({ date: '2026-10-03', taskIds: ['review', 'write'], budgetMinutes: 60 });
  const summary = dailyPlanSummary(plan, [write, setTaskCompleted(review, true, timestamp)]);
  assert.deepEqual(summary, {
    tasks: [setTaskCompleted(review, true, timestamp), write],
    missingTaskIds: [],
    taskCount: 2,
    completedTaskCount: 1,
    plannedMinutes: 75,
    completedMinutes: 30,
    budgetMinutes: 60,
    timeLeftMinutes: 0,
    overBudgetMinutes: 15
  });
});

test('keeps a plan readable when a planned task has since been deleted', () => {
  const plan = createDailyPlan({ date: '2026-10-03', taskIds: ['write', 'removed'], budgetMinutes: 120 });
  const summary = dailyPlanSummary(plan, [write]);
  assert.deepEqual(summary.missingTaskIds, ['removed']);
  assert.equal(summary.plannedMinutes, 45);
  assert.equal(summary.timeLeftMinutes, 75);
});
