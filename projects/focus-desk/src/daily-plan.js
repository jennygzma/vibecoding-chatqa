import { isLocalDate, isTaskRecord } from './domain.js';

export const DEFAULT_DAILY_BUDGET_MINUTES = 120;
export const MIN_DAILY_BUDGET_MINUTES = 5;
export const MAX_DAILY_BUDGET_MINUTES = 1440;

export function validateDailyPlan(input) {
  const errors = {};
  const date = input?.date;
  const taskIds = input?.taskIds;
  const budgetMinutes = input?.budgetMinutes ?? DEFAULT_DAILY_BUDGET_MINUTES;
  if (!isLocalDate(date)) errors.date = 'Choose a valid calendar date.';
  if (!Array.isArray(taskIds) || taskIds.some(id => typeof id !== 'string' || !id.trim() || id.length > 200)) {
    errors.taskIds = 'Choose valid tasks for this day.';
  } else if (new Set(taskIds).size !== taskIds.length) {
    errors.taskIds = 'A task can only be planned once per day.';
  }
  if (!Number.isInteger(budgetMinutes) || budgetMinutes < MIN_DAILY_BUDGET_MINUTES || budgetMinutes > MAX_DAILY_BUDGET_MINUTES) {
    errors.budgetMinutes = `Enter a whole number from ${MIN_DAILY_BUDGET_MINUTES} to ${MAX_DAILY_BUDGET_MINUTES}.`;
  }
  return { errors, value: { date, taskIds: Array.isArray(taskIds) ? [...taskIds] : taskIds, budgetMinutes } };
}

function validated(input) {
  const result = validateDailyPlan(input);
  if (Object.keys(result.errors).length) throw new Error(Object.values(result.errors).join(' '));
  return result.value;
}

export function createDailyPlan(input) {
  return validated(input);
}

export function isDailyPlanRecord(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return false;
  if (!['date', 'taskIds', 'budgetMinutes'].every(key => Object.hasOwn(plan, key))) return false;
  const result = validateDailyPlan(plan);
  return Object.keys(result.errors).length === 0
    && result.value.date === plan.date
    && result.value.budgetMinutes === plan.budgetMinutes
    && result.value.taskIds.length === plan.taskIds.length
    && result.value.taskIds.every((id, index) => id === plan.taskIds[index]);
}

export function dailyPlanRecord(plan) {
  return { date: plan.date, taskIds: [...plan.taskIds], budgetMinutes: plan.budgetMinutes };
}

export function removeTaskFromDailyPlans(plans, taskId) {
  if (!Array.isArray(plans) || plans.some(plan => !isDailyPlanRecord(plan))) {
    throw new Error('The daily plans are invalid.');
  }
  if (typeof taskId !== 'string' || !taskId.trim()) {
    throw new Error('Choose a valid task.');
  }
  return plans.map(plan => ({ ...dailyPlanRecord(plan), taskIds: plan.taskIds.filter(id => id !== taskId) }));
}

export function dailyPlanSummary(plan, tasks) {
  if (!isDailyPlanRecord(plan)) throw new Error('The daily plan is invalid.');
  if (!Array.isArray(tasks) || tasks.some(task => !isTaskRecord(task))) throw new Error('The task list is invalid.');
  const tasksById = new Map(tasks.map(task => [task.id, task]));
  const plannedTasks = plan.taskIds.map(id => tasksById.get(id)).filter(Boolean);
  const missingTaskIds = plan.taskIds.filter(id => !tasksById.has(id));
  const plannedMinutes = plannedTasks.reduce((total, task) => total + task.estimatedMinutes, 0);
  const completedTasks = plannedTasks.filter(task => task.completed);
  const completedMinutes = completedTasks.reduce((total, task) => total + task.estimatedMinutes, 0);
  const remainingMinutes = plan.budgetMinutes - plannedMinutes;
  return {
    tasks: plannedTasks,
    missingTaskIds,
    taskCount: plannedTasks.length,
    completedTaskCount: completedTasks.length,
    plannedMinutes,
    completedMinutes,
    budgetMinutes: plan.budgetMinutes,
    timeLeftMinutes: Math.max(0, remainingMinutes),
    overBudgetMinutes: Math.max(0, -remainingMinutes)
  };
}
