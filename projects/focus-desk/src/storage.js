import { isTaskRecord, taskRecord } from './domain.js';
import { dailyPlanRecord, isDailyPlanRecord } from './daily-plan.js';
import { focusHistoryRecord, isActiveFocusSession, isFocusHistoryRecord } from './focus.js';
export const STORAGE_KEY = 'focus-desk.tasks.v1';
export const STORAGE_VERSION = 1;
export const FOCUS_STORAGE_KEY = 'focus-desk.sessions.v1';
export const FOCUS_STORAGE_VERSION = 1;
export const DAILY_PLAN_STORAGE_KEY = 'focus-desk.daily-plans.v1';
export const DAILY_PLAN_STORAGE_VERSION = 1;

export function loadTasks(storage) {
  let raw;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch { return { tasks: [], writable: false, message: 'Local storage is unavailable. Your saved tasks could not be read. Reload to try again.' }; }
  if (raw === null) return { tasks: [], writable: true, message: '' };
  let data;
  try { data = JSON.parse(raw); }
  catch { return { tasks: [], writable: false, message: 'Saved task data is damaged. It has been preserved; editing is disabled to avoid overwriting it.' }; }
  if (!data || data.version !== STORAGE_VERSION || !Array.isArray(data.tasks)) {
    return { tasks: [], writable: false, message: 'Saved tasks use an unsupported format. The original data has been preserved; editing is disabled.' };
  }
  const seen = new Set();
  const tasks = [];
  let invalid = 0;
  for (const task of data.tasks) {
    if (!isTaskRecord(task) || seen.has(task.id)) { invalid++; continue; }
    seen.add(task.id);
    tasks.push(taskRecord(task));
  }
  return {
    tasks, writable: invalid === 0,
    message: invalid ? `${invalid} invalid or duplicate task record${invalid === 1 ? ' was' : 's were'} skipped. Valid tasks are visible. Editing is disabled to preserve the original data.` : ''
  };
}
export function saveTasks(storage, tasks) {
  if (!Array.isArray(tasks) || tasks.some(task => !isTaskRecord(task)) || new Set(tasks.map(task => task.id)).size !== tasks.length) {
    return { ok: false, message: 'These tasks could not be saved because their data is invalid. No changes were applied.' };
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, tasks: tasks.map(taskRecord) }));
    return { ok: true, message: '' };
  } catch {
    return { ok: false, message: 'Could not save to this browser. Storage may be full or blocked. No changes were applied. Your form is kept open so you can retry.' };
  }
}

export function loadFocusData(storage) {
  let raw;
  try { raw = storage.getItem(FOCUS_STORAGE_KEY); }
  catch { return { activeSession: null, history: [], writable: false, message: 'Local storage is unavailable. Focus sessions could not be read.' }; }
  if (raw === null) return { activeSession: null, history: [], writable: true, message: '' };
  let data;
  try { data = JSON.parse(raw); }
  catch { return { activeSession: null, history: [], writable: false, message: 'Saved focus data is damaged. It has been preserved; focus controls are disabled to avoid overwriting it.' }; }
  if (!data || data.version !== FOCUS_STORAGE_VERSION || !Array.isArray(data.history) || !Object.hasOwn(data, 'activeSession')) {
    return { activeSession: null, history: [], writable: false, message: 'Saved focus sessions use an unsupported format. The original data has been preserved; focus controls are disabled.' };
  }
  const ids = new Set();
  const allRecords = data.activeSession ? [data.activeSession, ...data.history] : data.history;
  if ((data.activeSession !== null && !isActiveFocusSession(data.activeSession)) || data.history.some(record => !isFocusHistoryRecord(record)) || allRecords.some(record => ids.has(record.id) || !ids.add(record.id))) {
    return { activeSession: null, history: [], writable: false, message: 'Saved focus data contains invalid or duplicate records. It has been preserved; focus controls are disabled.' };
  }
  return { activeSession: data.activeSession ? { ...data.activeSession } : null, history: data.history.map(focusHistoryRecord), writable: true, message: '' };
}

export function saveFocusData(storage, activeSession, history) {
  if ((activeSession !== null && !isActiveFocusSession(activeSession)) || !Array.isArray(history) || history.some(record => !isFocusHistoryRecord(record))) {
    return { ok: false, message: 'These focus sessions could not be saved because their data is invalid. No changes were applied.' };
  }
  const ids = new Set();
  const allRecords = activeSession ? [activeSession, ...history] : history;
  if (allRecords.some(record => ids.has(record.id) || !ids.add(record.id))) {
    return { ok: false, message: 'These focus sessions could not be saved because their records are duplicated. No changes were applied.' };
  }
  try {
    storage.setItem(FOCUS_STORAGE_KEY, JSON.stringify({ version: FOCUS_STORAGE_VERSION, activeSession, history: history.map(focusHistoryRecord) }));
    return { ok: true, message: '' };
  } catch {
    return { ok: false, message: 'Could not save focus sessions to this browser. Storage may be full or blocked. No changes were applied.' };
  }
}

export function loadDailyPlans(storage) {
  let raw;
  try { raw = storage.getItem(DAILY_PLAN_STORAGE_KEY); }
  catch { return { plans: [], writable: false, message: 'Local storage is unavailable. Daily plans could not be read.' }; }
  if (raw === null) return { plans: [], writable: true, message: '' };
  let data;
  try { data = JSON.parse(raw); }
  catch { return { plans: [], writable: false, message: 'Saved daily plan data is damaged. It has been preserved; planning is disabled to avoid overwriting it.' }; }
  if (!data || data.version !== DAILY_PLAN_STORAGE_VERSION || !Array.isArray(data.plans)) {
    return { plans: [], writable: false, message: 'Saved daily plans use an unsupported format. The original data has been preserved; planning is disabled.' };
  }
  const dates = new Set();
  const plans = [];
  let invalid = 0;
  for (const plan of data.plans) {
    if (!isDailyPlanRecord(plan) || dates.has(plan.date)) { invalid++; continue; }
    dates.add(plan.date);
    plans.push(dailyPlanRecord(plan));
  }
  return {
    plans,
    writable: invalid === 0,
    message: invalid ? `${invalid} invalid or duplicate daily plan record${invalid === 1 ? ' was' : 's were'} skipped. Valid plans are visible. Planning is disabled to preserve the original data.` : ''
  };
}

export function saveDailyPlans(storage, plans) {
  if (!Array.isArray(plans) || plans.some(plan => !isDailyPlanRecord(plan)) || new Set(plans.map(plan => plan.date)).size !== plans.length) {
    return { ok: false, message: 'These daily plans could not be saved because their data is invalid or duplicated. No changes were applied.' };
  }
  try {
    storage.setItem(DAILY_PLAN_STORAGE_KEY, JSON.stringify({ version: DAILY_PLAN_STORAGE_VERSION, plans: plans.map(dailyPlanRecord) }));
    return { ok: true, message: '' };
  } catch {
    return { ok: false, message: 'Could not save daily plans to this browser. Storage may be full or blocked. No changes were applied.' };
  }
}
