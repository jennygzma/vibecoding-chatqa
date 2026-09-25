export const PRIORITIES = ['Low', 'Medium', 'High'];

export function isLocalDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function validateInput(input) {
  const errors = {};
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const notes = input.notes ?? '';
  const priority = input.priority ?? 'Medium';
  const dueDate = input.dueDate === '' || input.dueDate == null ? null : input.dueDate;
  const estimatedMinutes = input.estimatedMinutes ?? 25;
  if (!title || title.length > 120) errors.title = 'Enter a title of 1–120 characters.';
  if (typeof notes !== 'string' || notes.length > 2000) errors.notes = 'Notes must be 2,000 characters or fewer.';
  if (!PRIORITIES.includes(priority)) errors.priority = 'Choose Low, Medium, or High.';
  if (dueDate !== null && !isLocalDate(dueDate)) errors.dueDate = 'Enter a valid calendar date.';
  if (!Number.isInteger(estimatedMinutes) || estimatedMinutes < 5 || estimatedMinutes > 480) errors.estimatedMinutes = 'Enter a whole number from 5 to 480.';
  return { errors, value: { title, notes, priority, dueDate, estimatedMinutes } };
}

function validated(input) {
  const result = validateInput(input);
  if (Object.keys(result.errors).length) throw new Error(Object.values(result.errors).join(' '));
  return result.value;
}

export function createTask(input, { id = globalThis.crypto.randomUUID(), now = new Date().toISOString() } = {}) {
  return { id, ...validated(input), completed: false, createdAt: now, updatedAt: now };
}
export function editTask(task, input, now = new Date().toISOString()) {
  return { ...task, ...validated(input), updatedAt: now };
}
export function setTaskCompleted(task, completed, now = new Date().toISOString()) {
  if (typeof completed !== 'boolean') throw new Error('Completion must be true or false.');
  return { ...task, completed, updatedAt: now };
}
export function filterTasks(tasks, { search = '', status = 'all', priority = 'all' } = {}) {
  const query = search.trim().toLocaleLowerCase('en');
  return tasks.filter(task => task.title.toLocaleLowerCase('en').includes(query)
    && (status === 'all' || (status === 'completed' ? task.completed : !task.completed))
    && (priority === 'all' || task.priority === priority));
}
export function localToday(date = new Date()) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function formatDueDate(value) {
  if (!isLocalDate(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(2000, month - 1, day, 12);
  date.setFullYear(year);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}
export function isTaskRecord(task) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return false;
  if (typeof task.id !== 'string' || !task.id.trim() || task.id.length > 200) return false;
  if (typeof task.completed !== 'boolean') return false;
  if (!['createdAt', 'updatedAt'].every(key => typeof task[key] === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(task[key]) && Number.isFinite(Date.parse(task[key])) && new Date(task[key]).toISOString() === task[key])) return false;
  if (!['title', 'notes', 'priority', 'dueDate', 'estimatedMinutes'].every(key => Object.hasOwn(task, key))) return false;
  const result = validateInput(task);
  return Object.keys(result.errors).length === 0 && result.value.title === task.title && (task.dueDate === null || isLocalDate(task.dueDate));
}
export function taskRecord(task) {
  return { id: task.id, title: task.title, notes: task.notes, priority: task.priority, dueDate: task.dueDate, estimatedMinutes: task.estimatedMinutes, completed: task.completed, createdAt: task.createdAt, updatedAt: task.updatedAt };
}
