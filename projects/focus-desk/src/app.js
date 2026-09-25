import {
  createTask,
  editTask,
  filterTasks,
  formatDueDate,
  localToday,
  setTaskCompleted
} from './domain.js';
import {
  checkpointFocusSession,
  createFocusSession,
  finishFocusSession,
  focusProgress,
  formatFocusDuration,
  pauseFocusSession,
  recoverFocusSession,
  resumeFocusSession
} from './focus.js';
import { createDailyPlan, dailyPlanSummary, removeTaskFromDailyPlans } from './daily-plan.js';
import { defaultInsightsRange, downloadInsightsCsv, formatInsightsDuration, formatInsightsPercentage, summarizeFocusHistory } from './insights.js';
import { loadDailyPlans, loadFocusData, loadTasks, saveDailyPlans, saveFocusData, saveTasks } from './storage.js';

const elements = {
  cancelDelete: document.querySelector('#cancel-delete'),
  cancelDialog: document.querySelector('#cancel-dialog'),
  clearFilters: document.querySelector('#clear-filters'),
  closeDialog: document.querySelector('#close-dialog'),
  completedCount: document.querySelector('#completed-count'),
  dailyPlanAddForm: document.querySelector('#daily-plan-add-form'),
  dailyPlanBudget: document.querySelector('#daily-plan-budget'),
  dailyPlanDate: document.querySelector('#daily-plan-date'),
  dailyPlanEmpty: document.querySelector('#daily-plan-empty'),
  dailyPlanList: document.querySelector('#daily-plan-list'),
  dailyPlanProgress: document.querySelector('#daily-plan-progress'),
  dailyPlanStatus: document.querySelector('#daily-plan-status'),
  dailyPlanStorageError: document.querySelector('#daily-plan-storage-error'),
  dailyPlanTask: document.querySelector('#daily-plan-task'),
  dailyPlanWorkload: document.querySelector('#daily-plan-workload'),
  deleteDialog: document.querySelector('#delete-dialog'),
  deleteDescription: document.querySelector('#delete-description'),
  deleteError: document.querySelector('#delete-error'),
  deleteForm: document.querySelector('#delete-form'),
  dialogTitle: document.querySelector('#dialog-title'),
  dueCount: document.querySelector('#due-count'),
  emptyAction: document.querySelector('#empty-action'),
  emptyDescription: document.querySelector('#empty-description'),
  emptyState: document.querySelector('#empty-state'),
  emptyTitle: document.querySelector('#empty-title'),
  exportInsights: document.querySelector('#export-insights'),
  feedback: document.querySelector('#feedback'),
  focusCancel: document.querySelector('#focus-cancel'),
  focusDuration: document.querySelector('#focus-duration'),
  focusElapsed: document.querySelector('#focus-elapsed'),
  focusEmpty: document.querySelector('#focus-empty'),
  focusFinish: document.querySelector('#focus-finish'),
  focusForm: document.querySelector('#focus-form'),
  focusHistory: document.querySelector('#focus-history'),
  focusHistoryEmpty: document.querySelector('#focus-history-empty'),
  focusPause: document.querySelector('#focus-pause'),
  focusResume: document.querySelector('#focus-resume'),
  focusRemaining: document.querySelector('#focus-remaining'),
  focusSetup: document.querySelector('#focus-setup'),
  focusState: document.querySelector('#focus-state'),
  focusStorageError: document.querySelector('#focus-storage-error'),
  focusTask: document.querySelector('#focus-task'),
  focusTitle: document.querySelector('#focus-title'),
  focusTimer: document.querySelector('#focus-timer'),
  focusTimerNote: document.querySelector('#focus-timer-note'),
  form: document.querySelector('#task-form'),
  formError: document.querySelector('#form-error'),
  navCount: document.querySelector('#nav-count'),
  newTask: document.querySelector('#new-task'),
  insightsEmpty: document.querySelector('#insights-empty'),
  insightsEndDate: document.querySelector('#insights-end-date'),
  insightsExportError: document.querySelector('#insights-export-error'),
  insightsFocusedTime: document.querySelector('#insights-focused-time'),
  insightsRangeError: document.querySelector('#insights-range-error'),
  insightsSessionCount: document.querySelector('#insights-session-count'),
  insightsStartDate: document.querySelector('#insights-start-date'),
  insightsTaskList: document.querySelector('#insights-task-list'),
  openCount: document.querySelector('#open-count'),
  priority: document.querySelector('#priority'),
  resultCount: document.querySelector('#result-count'),
  resultsAnnouncement: document.querySelector('#results-announcement'),
  saveTask: document.querySelector('#save-task'),
  search: document.querySelector('#search'),
  status: document.querySelector('#status'),
  storageError: document.querySelector('#storage-error'),
  taskDialog: document.querySelector('#task-dialog'),
  taskList: document.querySelector('#task-list'),
  today: document.querySelector('#today')
};

function getBrowserStorage() {
  try { return window.localStorage; }
  catch { return { getItem() { throw new Error('unavailable'); }, setItem() { throw new Error('unavailable'); } }; }
}

const browserStorage = getBrowserStorage();
const storageState = loadTasks(browserStorage);
const focusStorageState = loadFocusData(browserStorage);
const dailyPlanStorageState = loadDailyPlans(browserStorage);
let tasks = storageState.tasks;
let activeFocusSession = focusStorageState.activeSession;
let focusHistory = focusStorageState.history;
let dailyPlans = dailyPlanStorageState.plans;
let editableTaskId = null;
let deletingTaskId = null;
let opener = null;
let toastTimer;
let focusTimerInterval;
let focusWritable = focusStorageState.writable;
let dailyPlanWritable = dailyPlanStorageState.writable;
let focusRecoveryNotice = false;

function insightsRange() {
  return { startDate: elements.insightsStartDate.value, endDate: elements.insightsEndDate.value };
}

function renderInsights() {
  if (!elements.insightsStartDate.value || !elements.insightsEndDate.value) {
    const range = defaultInsightsRange();
    elements.insightsStartDate.value = range.startDate;
    elements.insightsEndDate.value = range.endDate;
  }
  try {
    const summary = summarizeFocusHistory(focusHistory, insightsRange());
    elements.insightsRangeError.textContent = '';
    elements.insightsFocusedTime.textContent = formatInsightsDuration(summary.focusedMilliseconds);
    elements.insightsSessionCount.textContent = String(summary.sessionCount);
    elements.insightsEmpty.hidden = summary.sessionCount > 0;
    elements.exportInsights.disabled = summary.sessionCount === 0;
    elements.insightsTaskList.replaceChildren(...summary.tasks.map(task => {
      const item = document.createElement('li');
      item.className = 'insights-task';
      const title = document.createElement('strong');
      title.textContent = task.taskTitle;
      const detail = document.createElement('span');
      detail.textContent = `${formatInsightsDuration(task.focusedMilliseconds)} · ${task.sessionCount} ${task.sessionCount === 1 ? 'session' : 'sessions'} · ${formatInsightsPercentage(task.focusedMilliseconds, summary.focusedMilliseconds)}`;
      const bar = document.createElement('span');
      bar.className = 'insights-task-bar';
      bar.style.width = formatInsightsPercentage(task.focusedMilliseconds, summary.focusedMilliseconds);
      bar.setAttribute('aria-hidden', 'true');
      item.append(title, detail, bar);
      return item;
    }));
    return summary;
  } catch (error) {
    elements.insightsRangeError.textContent = String(error.message || error);
    elements.insightsFocusedTime.textContent = '—';
    elements.insightsSessionCount.textContent = '—';
    elements.insightsEmpty.hidden = true;
    elements.insightsTaskList.replaceChildren();
    elements.exportInsights.disabled = true;
    return null;
  }
}

function exportInsights() {
  const summary = renderInsights();
  if (!summary || summary.sessionCount === 0) return;
  try {
    downloadInsightsCsv(summary, { Blob, document, setTimeout: window.setTimeout, URL });
    setNotice(elements.insightsExportError, '');
    showFeedback('CSV download request sent to your browser.');
  } catch {
    setNotice(elements.insightsExportError, 'The CSV could not be prepared for download. Please try again.');
  }
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function setNotice(element, message) {
  element.textContent = message;
  element.hidden = !message;
}

function showFeedback(message) {
  clearTimeout(toastTimer);
  elements.feedback.textContent = message;
  elements.feedback.hidden = false;
  toastTimer = window.setTimeout(() => { elements.feedback.hidden = true; }, 3600);
}

function activeFilters() {
  return { search: elements.search.value, status: elements.status.value, priority: elements.priority.value };
}

function clearFieldErrors() {
  elements.formError.hidden = true;
  elements.formError.textContent = '';
  for (const input of elements.form.querySelectorAll('input, textarea, select')) {
    input.removeAttribute('aria-invalid');
  }
  for (const error of elements.form.querySelectorAll('.field-error')) error.textContent = '';
}

function showFieldErrors(errors) {
  clearFieldErrors();
  for (const [name, message] of Object.entries(errors)) {
    const input = elements.form.elements.namedItem(name);
    const error = document.querySelector(`#${name}-error`);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (error) error.textContent = message;
  }
}

function persist(nextTasks) {
  if (!storageState.writable) return false;
  const result = saveTasks(browserStorage, nextTasks);
  if (!result.ok) {
    setNotice(elements.storageError, result.message);
    showFeedback('Your change could not be saved.');
    return false;
  }
  tasks = nextTasks;
  return true;
}

function persistFocus(nextActiveSession, nextHistory) {
  if (!focusWritable) return false;
  const result = saveFocusData(browserStorage, nextActiveSession, nextHistory);
  if (!result.ok) {
    focusWritable = false;
    setNotice(elements.focusStorageError, result.message);
    showFeedback('Your focus session could not be saved.');
    renderFocus();
    return false;
  }
  const historyChanged = nextHistory !== focusHistory;
  activeFocusSession = nextActiveSession;
  focusHistory = nextHistory;
  if (historyChanged) renderInsights();
  return true;
}

function persistDailyPlans(nextPlans) {
  if (!dailyPlanWritable) return false;
  const result = saveDailyPlans(browserStorage, nextPlans);
  if (!result.ok) {
    setNotice(elements.dailyPlanStorageError, result.message);
    showFeedback('Your daily plan could not be saved.');
    return false;
  }
  dailyPlans = nextPlans;
  return true;
}

function planForDate(date) {
  return dailyPlans.find(plan => plan.date === date) ?? createDailyPlan({ date, taskIds: [], budgetMinutes: 120 });
}

function saveDailyPlan(plan) {
  const nextPlans = dailyPlans.some(current => current.date === plan.date)
    ? dailyPlans.map(current => current.date === plan.date ? plan : current)
    : [...dailyPlans, plan];
  if (!persistDailyPlans(nextPlans)) return false;
  renderDailyPlan();
  return true;
}

function renderTask(task) {
  const item = document.createElement('li');
  item.className = `task-card${task.completed ? ' completed' : ''}`;
  item.dataset.taskId = task.id;

  const check = document.createElement('input');
  check.className = 'task-check';
  check.type = 'checkbox';
  check.checked = task.completed;
  check.dataset.action = 'toggle';
  check.setAttribute('aria-label', `${task.completed ? 'Reopen' : 'Mark'} ${task.title}`);
  item.append(check);

  const content = document.createElement('div');
  content.className = 'task-content';
  const title = document.createElement('p');
  title.className = 'task-title';
  title.textContent = task.title;
  content.append(title);
  if (task.notes) {
    const notes = document.createElement('p');
    notes.className = 'task-notes';
    notes.textContent = task.notes;
    content.append(notes);
  }
  const meta = document.createElement('div');
  meta.className = 'task-meta';
  const priority = document.createElement('span');
  priority.className = `badge priority-${task.priority.toLowerCase()}`;
  priority.textContent = task.priority;
  meta.append(priority);
  if (task.dueDate) {
    const due = document.createElement('span');
    due.textContent = `Due ${formatDueDate(task.dueDate)}`;
    if (!task.completed && task.dueDate < localToday()) due.className = 'overdue';
    meta.append(due);
  }
  const estimate = document.createElement('span');
  estimate.textContent = `${task.estimatedMinutes} min`;
  meta.append(estimate);
  content.append(meta);
  item.append(content);

  const actions = document.createElement('div');
  actions.className = 'task-actions';
  for (const [action, label] of [['focus', 'Focus'], ['edit', 'Edit'], ['delete', 'Delete']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-button';
    button.dataset.action = action;
    button.textContent = label;
    button.setAttribute('aria-label', `${label} ${task.title}`);
    actions.append(button);
  }
  item.append(actions);
  return item;
}

function focusOutcomeLabel(outcome) {
  return { completed: 'Completed', finishedEarly: 'Finished early', cancelled: 'Cancelled' }[outcome];
}

function formatFocusDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function updateFocusTimer() {
  if (!activeFocusSession) return;
  const progress = focusProgress(activeFocusSession);
  elements.focusElapsed.textContent = formatFocusDuration(progress.focusedMilliseconds);
  elements.focusRemaining.textContent = formatFocusDuration(progress.remainingMilliseconds);
  if (progress.complete) completeFocusSession();
}

function syncFocusTimer() {
  window.clearInterval(focusTimerInterval);
  if (activeFocusSession?.status === 'running') {
    updateFocusTimer();
    if (activeFocusSession?.status !== 'running') return;
    focusTimerInterval = window.setInterval(() => {
      if (!activeFocusSession || document.hidden) return;
      const checkpoint = checkpointFocusSession(activeFocusSession);
      if (persistFocus(checkpoint, focusHistory)) {
        renderFocus();
        if (focusProgress(activeFocusSession).complete) completeFocusSession();
      }
    }, 1000);
  }
}

function completeFocusSession() {
  if (!activeFocusSession) return;
  const record = finishFocusSession(activeFocusSession, 'completed', new Date().toISOString(), currentFocusTaskTitle());
  if (persistFocus(null, [record, ...focusHistory])) {
    focusRecoveryNotice = false;
    renderFocus();
    syncFocusTimer();
    showFeedback('Focus session completed.');
  }
}

function endFocusSession(outcome) {
  if (!activeFocusSession) return;
  const record = finishFocusSession(activeFocusSession, outcome, new Date().toISOString(), currentFocusTaskTitle());
  if (persistFocus(null, [record, ...focusHistory])) {
    focusRecoveryNotice = false;
    renderFocus();
    syncFocusTimer();
    showFeedback(outcome === 'cancelled' ? 'Focus session cancelled.' : 'Focus session finished early.');
  }
}

function currentFocusTaskTitle() {
  return tasks.find(task => task.id === activeFocusSession?.taskId)?.title ?? activeFocusSession?.taskTitle;
}

function pauseActiveFocus(message = 'Focus timer paused.') {
  if (!activeFocusSession || activeFocusSession.status !== 'running') return;
  const paused = pauseFocusSession(activeFocusSession);
  if (focusProgress(paused).complete) {
    const record = finishFocusSession(paused, 'completed', new Date().toISOString(), currentFocusTaskTitle());
    if (persistFocus(null, [record, ...focusHistory])) {
      renderFocus();
      syncFocusTimer();
      showFeedback('Focus session completed.');
    }
    return;
  }
  if (persistFocus(paused, focusHistory)) {
    renderFocus();
    syncFocusTimer();
    showFeedback(message);
  }
}

function renderFocus() {
  const selectedTaskId = elements.focusTask.value;
  elements.focusTask.replaceChildren(...tasks.map(task => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = task.title;
    return option;
  }));
  if (tasks.some(task => task.id === selectedTaskId)) elements.focusTask.value = selectedTaskId;
  else if (tasks.length) elements.focusTask.value = tasks[0].id;
  const hasActive = Boolean(activeFocusSession);
  elements.focusSetup.hidden = hasActive;
  elements.focusForm.hidden = hasActive;
  elements.focusTimerNote.hidden = !focusRecoveryNotice;
  elements.focusTimer.hidden = !hasActive;
  if (hasActive) {
    const progress = focusProgress(activeFocusSession);
    elements.focusTitle.textContent = activeFocusSession.taskTitle;
    elements.focusState.textContent = activeFocusSession.status === 'running' ? 'Running' : 'Paused';
    elements.focusElapsed.textContent = formatFocusDuration(progress.focusedMilliseconds);
    elements.focusRemaining.textContent = formatFocusDuration(progress.remainingMilliseconds);
    elements.focusPause.hidden = activeFocusSession.status !== 'running';
    elements.focusResume.hidden = activeFocusSession.status !== 'paused';
  } else {
    elements.focusState.textContent = 'Ready';
  }
  elements.focusTask.disabled = !focusWritable || !tasks.length;
  elements.focusDuration.disabled = !focusWritable || !tasks.length;
  elements.focusEmpty.hidden = tasks.length > 0;
  elements.focusForm.querySelector('button[type="submit"]').disabled = !focusWritable || !tasks.length;
  elements.focusPause.disabled = !focusWritable;
  elements.focusResume.disabled = !focusWritable;
  elements.focusFinish.disabled = !focusWritable;
  elements.focusCancel.disabled = !focusWritable;
  elements.focusHistory.replaceChildren(...focusHistory.map(record => {
    const item = document.createElement('li');
    item.className = 'focus-history-item';
    const title = document.createElement('strong');
    title.textContent = record.taskTitle;
    const detail = document.createElement('span');
    detail.textContent = `${formatFocusDuration(record.focusedMilliseconds)} focused · ${formatFocusDate(record.endedAt)}`;
    const outcome = document.createElement('span');
    outcome.className = `focus-outcome ${record.outcome}`;
    outcome.textContent = focusOutcomeLabel(record.outcome);
    item.append(title, detail, outcome);
    return item;
  }));
  elements.focusHistoryEmpty.hidden = focusHistory.length > 0;
}

function planMinutes(minutes) {
  return `${minutes} min`;
}

function renderDailyPlanTask(task, index, total) {
  const item = document.createElement('li');
  item.className = `daily-plan-item${task.completed ? ' completed' : ''}`;
  item.dataset.planTaskId = task.id;

  const check = document.createElement('input');
  check.className = 'task-check';
  check.type = 'checkbox';
  check.checked = task.completed;
  check.dataset.dailyPlanAction = 'toggle';
  check.setAttribute('aria-label', `${task.completed ? 'Reopen' : 'Mark'} ${task.title}`);

  const order = document.createElement('span');
  order.className = 'daily-plan-order';
  order.textContent = String(index + 1).padStart(2, '0');
  order.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.className = 'daily-plan-content';
  const title = document.createElement('strong');
  title.textContent = task.title;
  const detail = document.createElement('span');
  detail.textContent = `${planMinutes(task.estimatedMinutes)}${task.completed ? ' · Complete' : ''}`;
  content.append(title, detail);

  const actions = document.createElement('div');
  actions.className = 'daily-plan-actions';
  for (const [action, label, disabled] of [
    ['move-up', 'Move up', index === 0],
    ['move-down', 'Move down', index === total - 1],
    ['focus', 'Focus', false],
    ['remove', 'Remove', false]
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = action === 'remove' ? 'text-button daily-plan-remove' : 'icon-button';
    button.dataset.dailyPlanAction = action;
    button.disabled = disabled || !dailyPlanWritable;
    button.textContent = label;
    button.setAttribute('aria-label', `${label} ${task.title}`);
    actions.append(button);
  }
  item.append(check, order, content, actions);
  return item;
}

function renderDailyPlan() {
  if (!elements.dailyPlanDate.value) elements.dailyPlanDate.value = localToday();
  const date = elements.dailyPlanDate.value;
  const plan = planForDate(date);
  const summary = dailyPlanSummary(plan, tasks);
  const selectedTaskId = elements.dailyPlanTask.value;
  const plannedIds = new Set(plan.taskIds);
  const availableTasks = tasks.filter(task => !plannedIds.has(task.id));
  elements.dailyPlanTask.replaceChildren(...availableTasks.map(task => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = `${task.title}${task.completed ? ' · Complete' : ''}`;
    return option;
  }));
  if (availableTasks.some(task => task.id === selectedTaskId)) elements.dailyPlanTask.value = selectedTaskId;
  else if (availableTasks.length) elements.dailyPlanTask.value = availableTasks[0].id;
  elements.dailyPlanBudget.value = plan.budgetMinutes;
  elements.dailyPlanWorkload.textContent = planMinutes(summary.plannedMinutes);
  elements.dailyPlanStatus.textContent = summary.overBudgetMinutes
    ? `${planMinutes(summary.overBudgetMinutes)} over budget`
    : `${planMinutes(summary.timeLeftMinutes)} left`;
  elements.dailyPlanStatus.classList.toggle('over-budget', summary.overBudgetMinutes > 0);
  elements.dailyPlanProgress.textContent = `${summary.completedTaskCount} of ${summary.taskCount} tasks complete`;
  elements.dailyPlanList.replaceChildren(...summary.tasks.map((task, index) => renderDailyPlanTask(task, index, summary.taskCount)));
  const noTasks = tasks.length === 0;
  const allPlanned = !noTasks && availableTasks.length === 0;
  elements.dailyPlanEmpty.hidden = summary.taskCount > 0;
  elements.dailyPlanEmpty.textContent = noTasks
    ? 'Add a task before planning this day.'
    : allPlanned
      ? 'Every task is already on this day.'
      : 'No tasks planned for this day yet.';
  elements.dailyPlanTask.disabled = !dailyPlanWritable || !availableTasks.length;
  elements.dailyPlanAddForm.querySelector('button[type="submit"]').disabled = !dailyPlanWritable || !availableTasks.length;
  elements.dailyPlanBudget.disabled = !dailyPlanWritable;
  if (summary.missingTaskIds.length) {
    setNotice(elements.dailyPlanStorageError, `${summary.missingTaskIds.length} removed task${summary.missingTaskIds.length === 1 ? ' is' : 's are'} no longer included in this plan.`);
  } else if (dailyPlanStorageState.message) {
    setNotice(elements.dailyPlanStorageError, dailyPlanStorageState.message);
  } else {
    setNotice(elements.dailyPlanStorageError, '');
  }
}

function render() {
  const filtered = filterTasks(tasks, activeFilters());
  const open = tasks.filter(task => !task.completed);
  const today = localToday();
  const completed = tasks.length - open.length;
  setText('#open-count', open.length);
  setText('#due-count', open.filter(task => task.dueDate === today).length);
  setText('#completed-count', completed);
  setText('#nav-count', open.length);
  setText('#result-count', filtered.length);
  elements.resultsAnnouncement.textContent = `${filtered.length} ${filtered.length === 1 ? 'task' : 'tasks'} shown.`;
  elements.clearFilters.hidden = !elements.search.value && elements.status.value === 'all' && elements.priority.value === 'all';
  elements.taskList.replaceChildren(...filtered.map(renderTask));
  const hasFilters = filtered.length !== tasks.length;
  elements.emptyState.hidden = filtered.length > 0;
  elements.emptyTitle.textContent = hasFilters ? 'No tasks match these filters.' : 'A clear desk. A fresh start.';
  elements.emptyDescription.textContent = hasFilters ? 'Try a different search, status, or priority.' : 'Add your first task and give your next step a home.';
  elements.emptyAction.textContent = hasFilters ? 'Clear filters' : 'Create your first task';
  renderFocus();
  renderDailyPlan();
  renderInsights();
}

function openTaskDialog(task = null, trigger = null) {
  if (!storageState.writable) return;
  opener = trigger;
  editableTaskId = task?.id ?? null;
  clearFieldErrors();
  elements.form.reset();
  elements.form.elements.priority.value = task?.priority ?? 'Medium';
  elements.form.elements.estimatedMinutes.value = task?.estimatedMinutes ?? 25;
  elements.form.elements.title.value = task?.title ?? '';
  elements.form.elements.notes.value = task?.notes ?? '';
  elements.form.elements.dueDate.value = task?.dueDate ?? '';
  elements.dialogTitle.textContent = task ? 'Edit task' : 'New task';
  elements.saveTask.textContent = task ? 'Save changes' : 'Create task';
  elements.taskDialog.showModal();
  window.setTimeout(() => elements.form.elements.title.focus(), 0);
}

function closeTaskDialog() {
  elements.taskDialog.close();
  opener?.focus();
}

function openDeleteDialog(task, trigger) {
  if (!storageState.writable) return;
  deletingTaskId = task.id;
  opener = trigger;
  setNotice(elements.deleteError, '');
  elements.deleteDescription.textContent = `“${task.title}” will be permanently removed.`;
  elements.deleteDialog.showModal();
}

function closeDeleteDialog() {
  elements.deleteDialog.close();
  opener?.focus();
}

function saveForm(event) {
  event.preventDefault();
  const input = {
    title: elements.form.elements.title.value,
    notes: elements.form.elements.notes.value,
    priority: elements.form.elements.priority.value,
    dueDate: elements.form.elements.dueDate.value,
    estimatedMinutes: Number(elements.form.elements.estimatedMinutes.value)
  };
  try {
    const now = new Date().toISOString();
    const existing = editableTaskId ? tasks.find(task => task.id === editableTaskId) : null;
    const next = existing
      ? tasks.map(task => task.id === existing.id ? editTask(existing, input, now) : task)
      : [createTask(input, { now }), ...tasks];
    if (!existing && editableTaskId) throw new Error('This task is no longer available. Please reopen the task list.');
    if (!persist(next)) return;
    closeTaskDialog();
    render();
    showFeedback(existing ? 'Task updated.' : 'Task created.');
  } catch (error) {
    const message = String(error.message || error);
    const mapping = {
      'Enter a title of 1–120 characters.': 'title',
      'Notes must be 2,000 characters or fewer.': 'notes',
      'Choose Low, Medium, or High.': 'priority',
      'Enter a valid calendar date.': 'dueDate',
      'Enter a whole number from 5 to 480.': 'estimatedMinutes'
    };
    const field = mapping[message];
    if (field) showFieldErrors({ [field]: message });
    else setNotice(elements.formError, message);
  }
}

function taskAction(event) {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  if (control.dataset.action === 'toggle' && event.type !== 'change') return;
  if (control.dataset.action !== 'toggle' && event.type !== 'click') return;
  const card = control.closest('[data-task-id]');
  const task = tasks.find(candidate => candidate.id === card?.dataset.taskId);
  if (!task) return;
  if (control.dataset.action === 'toggle') {
    const nextTask = setTaskCompleted(task, control.checked);
    if (persist(tasks.map(candidate => candidate.id === task.id ? nextTask : candidate))) {
      render();
      showFeedback(nextTask.completed ? 'Task completed.' : 'Task reopened.');
    } else control.checked = task.completed;
  }
  if (control.dataset.action === 'focus') {
    elements.focusTask.value = task.id;
    document.querySelector('#focus-workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
    elements.focusTask.focus({ preventScroll: true });
  }
  if (control.dataset.action === 'edit') openTaskDialog(task, control);
  if (control.dataset.action === 'delete') openDeleteDialog(task, control);
}

function dailyPlanAction(event) {
  const control = event.target.closest('[data-daily-plan-action]');
  if (!control) return;
  if (control.dataset.dailyPlanAction === 'toggle' && event.type !== 'change') return;
  if (control.dataset.dailyPlanAction !== 'toggle' && event.type !== 'click') return;
  const task = tasks.find(candidate => candidate.id === control.closest('[data-plan-task-id]')?.dataset.planTaskId);
  if (!task) return;
  const action = control.dataset.dailyPlanAction;
  if (action === 'toggle') {
    const nextTask = setTaskCompleted(task, control.checked);
    if (persist(tasks.map(candidate => candidate.id === task.id ? nextTask : candidate))) {
      render();
      showFeedback(nextTask.completed ? 'Task completed.' : 'Task reopened.');
    } else control.checked = task.completed;
    return;
  }
  if (action === 'focus') {
    elements.focusTask.value = task.id;
    document.querySelector('#focus-workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
    elements.focusTask.focus({ preventScroll: true });
    return;
  }
  const plan = planForDate(elements.dailyPlanDate.value);
  const plannedTaskIds = plan.taskIds.filter(id => tasks.some(candidate => candidate.id === id));
  const index = plannedTaskIds.indexOf(task.id);
  let taskIds = [...plan.taskIds];
  if (action === 'remove') taskIds = taskIds.filter(id => id !== task.id);
  if (action === 'move-up' && index > 0) {
    [plannedTaskIds[index - 1], plannedTaskIds[index]] = [plannedTaskIds[index], plannedTaskIds[index - 1]];
    taskIds = [...plannedTaskIds, ...plan.taskIds.filter(id => !tasks.some(candidate => candidate.id === id))];
  }
  if (action === 'move-down' && index < plannedTaskIds.length - 1) {
    [plannedTaskIds[index + 1], plannedTaskIds[index]] = [plannedTaskIds[index], plannedTaskIds[index + 1]];
    taskIds = [...plannedTaskIds, ...plan.taskIds.filter(id => !tasks.some(candidate => candidate.id === id))];
  }
  if (saveDailyPlan({ ...plan, taskIds })) showFeedback(action === 'remove' ? 'Task removed from this day.' : 'Plan order updated.');
}

elements.newTask.addEventListener('click', event => openTaskDialog(null, event.currentTarget));
elements.emptyAction.addEventListener('click', event => {
  if (elements.clearFilters.hidden) openTaskDialog(null, event.currentTarget);
  else {
    elements.search.value = '';
    elements.status.value = 'all';
    elements.priority.value = 'all';
    render();
  }
});
elements.closeDialog.addEventListener('click', closeTaskDialog);
elements.cancelDialog.addEventListener('click', closeTaskDialog);
elements.form.addEventListener('submit', saveForm);
elements.taskList.addEventListener('click', taskAction);
elements.taskList.addEventListener('change', taskAction);
elements.dailyPlanDate.addEventListener('change', renderDailyPlan);
elements.dailyPlanBudget.addEventListener('change', () => {
  const plan = planForDate(elements.dailyPlanDate.value);
  try {
    const next = createDailyPlan({ ...plan, budgetMinutes: Number(elements.dailyPlanBudget.value) });
    if (saveDailyPlan(next)) showFeedback('Daily budget updated.');
  } catch (error) {
    renderDailyPlan();
    showFeedback(String(error.message || error));
  }
});
elements.dailyPlanAddForm.addEventListener('submit', event => {
  event.preventDefault();
  const taskId = elements.dailyPlanTask.value;
  const plan = planForDate(elements.dailyPlanDate.value);
  if (!tasks.some(task => task.id === taskId) || plan.taskIds.includes(taskId)) return;
  if (saveDailyPlan({ ...plan, taskIds: [...plan.taskIds, taskId] })) showFeedback('Task added to this day.');
});
elements.dailyPlanList.addEventListener('click', dailyPlanAction);
elements.dailyPlanList.addEventListener('change', dailyPlanAction);
for (const element of [elements.insightsStartDate, elements.insightsEndDate]) element.addEventListener('change', renderInsights);
elements.exportInsights.addEventListener('click', exportInsights);
for (const element of [elements.search, elements.status, elements.priority]) element.addEventListener('input', render);
elements.clearFilters.addEventListener('click', () => {
  elements.search.value = '';
  elements.status.value = 'all';
  elements.priority.value = 'all';
  render();
  elements.search.focus();
});
elements.cancelDelete.addEventListener('click', closeDeleteDialog);
elements.deleteForm.addEventListener('submit', event => {
  event.preventDefault();
  const task = tasks.find(candidate => candidate.id === deletingTaskId);
  if (!task) { setNotice(elements.deleteError, 'This task is no longer available.'); return; }
  const previousDailyPlans = dailyPlans;
  const nextDailyPlans = removeTaskFromDailyPlans(previousDailyPlans, task.id);
  if (!persistDailyPlans(nextDailyPlans)) {
    setNotice(elements.deleteError, 'The task could not be removed from saved daily plans. Please try again.');
    return;
  }
  if (!persist(tasks.filter(candidate => candidate.id !== task.id))) {
    const restored = persistDailyPlans(previousDailyPlans);
    setNotice(elements.deleteError, restored
      ? 'The task could not be deleted. Its daily plans were restored. Please try again.'
      : 'The task could not be deleted, and its saved daily plans could not be restored. Please reload before trying again.');
    return;
  }
  closeDeleteDialog();
  render();
  showFeedback('Task deleted.');
});
elements.focusForm.addEventListener('submit', event => {
  event.preventDefault();
  const task = tasks.find(candidate => candidate.id === elements.focusTask.value);
  try {
    const session = createFocusSession(task, Number(elements.focusDuration.value));
    if (persistFocus(session, focusHistory)) {
      focusRecoveryNotice = false;
      renderFocus();
      syncFocusTimer();
      showFeedback(`Focus started for ${session.taskTitle}.`);
    }
  } catch (error) {
    showFeedback(String(error.message || error));
  }
});
elements.focusPause.addEventListener('click', () => pauseActiveFocus());
elements.focusResume.addEventListener('click', () => {
  if (!activeFocusSession) return;
  try {
    const resumed = resumeFocusSession(activeFocusSession);
    if (persistFocus(resumed, focusHistory)) {
      focusRecoveryNotice = false;
      renderFocus();
      syncFocusTimer();
      showFeedback('Focus timer resumed.');
    }
  } catch (error) { showFeedback(String(error.message || error)); }
});
elements.focusFinish.addEventListener('click', () => endFocusSession('finishedEarly'));
elements.focusCancel.addEventListener('click', () => endFocusSession('cancelled'));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseActiveFocus('Focus timer paused while this page was hidden.');
});
for (const dialog of [elements.taskDialog, elements.deleteDialog]) {
  dialog.addEventListener('cancel', () => { window.setTimeout(() => opener?.focus(), 0); });
}

elements.today.textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
setNotice(elements.storageError, storageState.message);
setNotice(elements.focusStorageError, focusStorageState.message);
setNotice(elements.dailyPlanStorageError, dailyPlanStorageState.message);
if (activeFocusSession?.status === 'running') {
  const recovered = recoverFocusSession(activeFocusSession);
  if (persistFocus(recovered, focusHistory)) {
    focusRecoveryNotice = true;
  }
}
for (const control of [elements.newTask, elements.emptyAction]) control.disabled = !storageState.writable;
render();
syncFocusTimer();
