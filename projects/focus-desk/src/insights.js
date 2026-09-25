import { isLocalDate, localToday } from './domain.js';

const CSV_DOWNLOAD_URL_LIFETIME = 60_000;

function localDateFromTimestamp(value) {
  return localToday(new Date(value));
}

function ensureRange(startDate, endDate) {
  if (!isLocalDate(startDate) || !isLocalDate(endDate)) throw new Error('Choose a valid start and end date.');
  if (startDate > endDate) throw new Error('The start date must be on or before the end date.');
}

export function defaultInsightsRange(today = new Date()) {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return { startDate: localToday(start), endDate: localToday(end) };
}

export function summarizeFocusHistory(history, { startDate, endDate }) {
  ensureRange(startDate, endDate);
  if (!Array.isArray(history)) throw new Error('Focus history must be a list.');
  const taskTotals = new Map();
  let focusedMilliseconds = 0;
  let sessionCount = 0;
  for (const record of history) {
    const localDate = localDateFromTimestamp(record.endedAt);
    if (localDate < startDate || localDate > endDate) continue;
    focusedMilliseconds += record.focusedMilliseconds;
    sessionCount += 1;
    const current = taskTotals.get(record.taskId) ?? { taskId: record.taskId, taskTitle: record.taskTitle, focusedMilliseconds: 0, sessionCount: 0 };
    current.focusedMilliseconds += record.focusedMilliseconds;
    current.sessionCount += 1;
    taskTotals.set(record.taskId, current);
  }
  const tasks = [...taskTotals.values()].sort((first, second) => second.focusedMilliseconds - first.focusedMilliseconds
    || second.sessionCount - first.sessionCount || first.taskTitle.localeCompare(second.taskTitle));
  return { startDate, endDate, focusedMilliseconds, sessionCount, tasks };
}

export function formatInsightsDuration(milliseconds) {
  const wholeSeconds = Math.floor(Math.max(0, milliseconds) / 1_000);
  const hours = Math.floor(wholeSeconds / 3_600);
  const minutes = Math.floor((wholeSeconds % 3_600) / 60);
  const seconds = wholeSeconds % 60;
  return hours ? `${hours}h ${minutes}m ${seconds}s` : `${minutes}m ${seconds}s`;
}

export function formatInsightsPercentage(part, total) {
  if (total <= 0) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function insightsCsv(summary) {
  const rows = [
    ['Start date', 'End date', 'Task name', 'Focused milliseconds', 'Focused time', 'Session count'],
    ...summary.tasks.map(task => [summary.startDate, summary.endDate, task.taskTitle, task.focusedMilliseconds, formatInsightsDuration(task.focusedMilliseconds), task.sessionCount])
  ];
  return `${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function downloadInsightsCsv(summary, { Blob: BlobConstructor, document, setTimeout, URL: urlApi }) {
  let url;
  let link;
  try {
    const blob = new BlobConstructor([insightsCsv(summary)], { type: 'text/csv;charset=utf-8' });
    url = urlApi.createObjectURL(blob);
    link = document.createElement('a');
    link.href = url;
    link.download = `focus-insights-${summary.startDate}-to-${summary.endDate}.csv`;
    document.body.append(link);
    link.click();
  } catch (error) {
    if (url) urlApi.revokeObjectURL(url);
    throw error;
  } finally {
    link?.remove();
  }
  setTimeout(() => urlApi.revokeObjectURL(url), CSV_DOWNLOAD_URL_LIFETIME);
}
