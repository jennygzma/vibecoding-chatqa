const MIN_DURATION_MINUTES = 1;
const MAX_DURATION_MINUTES = 480;
const ACTIVE_STATUSES = new Set(['running', 'paused']);
const HISTORY_OUTCOMES = new Set(['completed', 'finishedEarly', 'cancelled']);

function isTimestamp(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function timestamp(value = new Date().toISOString()) {
  if (!isTimestamp(value)) throw new Error('A valid timestamp is required.');
  return value;
}

function durationMilliseconds(minutes) {
  if (!Number.isInteger(minutes) || minutes < MIN_DURATION_MINUTES || minutes > MAX_DURATION_MINUTES) {
    throw new Error(`Choose a whole focus duration from ${MIN_DURATION_MINUTES} to ${MAX_DURATION_MINUTES} minutes.`);
  }
  return minutes * 60_000;
}

function focusMilliseconds(session, now) {
  if (session.status !== 'running') return session.focusedMilliseconds;
  return Math.min(session.durationMilliseconds, session.focusedMilliseconds + Math.max(0, Date.parse(now) - Date.parse(session.lastResumedAt)));
}

function snapshot(session) {
  return {
    id: session.id,
    taskId: session.taskId,
    taskTitle: session.taskTitle,
    durationMilliseconds: session.durationMilliseconds,
    focusedMilliseconds: session.focusedMilliseconds,
    startedAt: session.startedAt,
    status: session.status,
    lastResumedAt: session.lastResumedAt
  };
}

export function createFocusSession(task, minutes = 25, { id = globalThis.crypto.randomUUID(), now = new Date().toISOString() } = {}) {
  if (!task || typeof task.id !== 'string' || !task.id.trim() || typeof task.title !== 'string' || !task.title.trim()) {
    throw new Error('Choose a task before starting focus.');
  }
  if (typeof id !== 'string' || !id.trim()) throw new Error('A session id is required.');
  const startedAt = timestamp(now);
  return {
    id,
    taskId: task.id,
    taskTitle: task.title.trim(),
    durationMilliseconds: durationMilliseconds(minutes),
    focusedMilliseconds: 0,
    startedAt,
    status: 'running',
    lastResumedAt: startedAt
  };
}

export function isActiveFocusSession(session) {
  if (!session || typeof session !== 'object' || Array.isArray(session)) return false;
  if (typeof session.id !== 'string' || !session.id.trim() || typeof session.taskId !== 'string' || !session.taskId.trim()) return false;
  if (typeof session.taskTitle !== 'string' || !session.taskTitle.trim() || session.taskTitle.length > 120) return false;
  if (!Number.isInteger(session.durationMilliseconds) || session.durationMilliseconds < MIN_DURATION_MINUTES * 60_000 || session.durationMilliseconds > MAX_DURATION_MINUTES * 60_000) return false;
  if (!Number.isInteger(session.focusedMilliseconds) || session.focusedMilliseconds < 0 || session.focusedMilliseconds > session.durationMilliseconds) return false;
  if (!isTimestamp(session.startedAt) || !ACTIVE_STATUSES.has(session.status)) return false;
  return session.status === 'running' ? isTimestamp(session.lastResumedAt) : session.lastResumedAt === null;
}

export function focusProgress(session, now = new Date().toISOString()) {
  if (!isActiveFocusSession(session)) throw new Error('The active focus session is invalid.');
  const currentTime = timestamp(now);
  const focused = focusMilliseconds(session, currentTime);
  return {
    focusedMilliseconds: focused,
    remainingMilliseconds: Math.max(0, session.durationMilliseconds - focused),
    complete: focused >= session.durationMilliseconds
  };
}

export function checkpointFocusSession(session, now = new Date().toISOString()) {
  if (!isActiveFocusSession(session)) throw new Error('The active focus session is invalid.');
  const currentTime = timestamp(now);
  if (session.status === 'paused') return snapshot(session);
  return { ...snapshot(session), focusedMilliseconds: focusMilliseconds(session, currentTime), lastResumedAt: currentTime };
}

export function pauseFocusSession(session, now = new Date().toISOString()) {
  if (!isActiveFocusSession(session)) throw new Error('The active focus session is invalid.');
  const currentTime = timestamp(now);
  return { ...snapshot(session), focusedMilliseconds: focusMilliseconds(session, currentTime), status: 'paused', lastResumedAt: null };
}

export function resumeFocusSession(session, now = new Date().toISOString()) {
  if (!isActiveFocusSession(session)) throw new Error('The active focus session is invalid.');
  if (session.status !== 'paused') throw new Error('This focus session is already running.');
  const currentTime = timestamp(now);
  return { ...snapshot(session), status: 'running', lastResumedAt: currentTime };
}

export function recoverFocusSession(session) {
  if (!isActiveFocusSession(session)) throw new Error('The active focus session is invalid.');
  return session.status === 'running' ? { ...snapshot(session), status: 'paused', lastResumedAt: null } : snapshot(session);
}

export function finishFocusSession(session, outcome, now = new Date().toISOString(), taskTitle = session.taskTitle) {
  if (!isActiveFocusSession(session)) throw new Error('The active focus session is invalid.');
  if (!HISTORY_OUTCOMES.has(outcome)) throw new Error('Choose a valid session outcome.');
  const endedAt = timestamp(now);
  if (typeof taskTitle !== 'string' || !taskTitle.trim() || taskTitle.trim().length > 120) {
    throw new Error('A valid task title is required.');
  }
  const focused = focusMilliseconds(session, endedAt);
  if (outcome === 'completed' && focused < session.durationMilliseconds) throw new Error('Only a completed timer can be marked complete.');
  return {
    id: session.id,
    taskId: session.taskId,
    taskTitle: taskTitle.trim(),
    durationMilliseconds: session.durationMilliseconds,
    focusedMilliseconds: focused,
    startedAt: session.startedAt,
    endedAt,
    outcome
  };
}

export function isFocusHistoryRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  if (typeof record.id !== 'string' || !record.id.trim() || typeof record.taskId !== 'string' || !record.taskId.trim()) return false;
  if (typeof record.taskTitle !== 'string' || !record.taskTitle.trim() || record.taskTitle.length > 120) return false;
  if (!Number.isInteger(record.durationMilliseconds) || record.durationMilliseconds < MIN_DURATION_MINUTES * 60_000 || record.durationMilliseconds > MAX_DURATION_MINUTES * 60_000) return false;
  if (!Number.isInteger(record.focusedMilliseconds) || record.focusedMilliseconds < 0 || record.focusedMilliseconds > record.durationMilliseconds) return false;
  return isTimestamp(record.startedAt)
    && isTimestamp(record.endedAt)
    && Date.parse(record.endedAt) >= Date.parse(record.startedAt)
    && HISTORY_OUTCOMES.has(record.outcome)
    && (record.outcome !== 'completed' || record.focusedMilliseconds === record.durationMilliseconds);
}

export function focusHistoryRecord(record) {
  return { ...record };
}

export function formatFocusDuration(milliseconds) {
  const wholeSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const seconds = wholeSeconds % 60;
  return hours ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}
