export const ROOM = { width: 16, depth: 12 };
export const TILE_SIZE = 32;
export const FOUNDER_RADIUS = 0.18;
// Keep the initial position in the aisle between the phone and floor lamp.
export const START = { x: 8.25, y: 9.25 };

export const OBJECTS = [
  { id: 'fern', type: 'plant', x: 1, y: 1, w: 1, d: 1, height: 2, label: 'The office optimist', target: { x: 2.25, y: 1.5 } },
  { id: 'plan', type: 'board', x: 4, y: 0, w: 4, d: 1, height: 2, label: 'The big-idea board', target: { x: 4.5, y: 1.25 } },
  { id: 'cabinet', type: 'cabinet', x: 0, y: 3, w: 2, d: 3, height: 1, label: 'The coffee corner', action: 'coffee', target: { x: 2.25, y: 4.5 } },
  { id: 'books', type: 'shelf', x: 0, y: 7, w: 2, d: 2, height: 2, label: 'Founder upgrade station', target: { x: 2.25, y: 8 } },
  { id: 'doorplant', type: 'plant', x: 1, y: 10, w: 1, d: 1, height: 2, label: 'Your leafy cofounder', target: { x: 2.25, y: 10.5 } },
  { id: 'bed', type: 'bed', x: 3, y: 9, w: 3, d: 2, height: 1, label: 'Sleep to end the day', action: 'sleep', target: { x: 6.25, y: 10.5 } },
  { id: 'work', type: 'desk', x: 10, y: 2, w: 3, d: 2, height: 2, label: 'Your workstation', target: { x: 10.5, y: 4.5 } },
  { id: 'chair', type: 'chair', x: 11, y: 4, w: 1, d: 1, height: 1, label: 'The founder’s seat', action: 'work', target: { x: 10.5, y: 4.5 } },
  { id: 'backplant', type: 'plant', x: 14, y: 1, w: 1, d: 1, height: 2, label: 'Chief oxygen officer', target: { x: 14.5, y: 2.25 } },
  { id: 'pills', type: 'pills', x: 14, y: 3, w: 1, d: 1, height: 1, label: 'The vitamin shelf', action: 'pills', target: { x: 13.5, y: 4.25 } },
  { id: 'peptide', type: 'peptide', x: 14, y: 5, w: 1, d: 1, height: 1, label: 'Experimental peptide kit', action: 'peptide', target: { x: 12.5, y: 5.5 } },
  { id: 'sofa', type: 'sofa', x: 13, y: 6, w: 2, d: 3, height: 1, label: 'The break sofa', action: 'sofa', target: { x: 12, y: 6.5 } },
  { id: 'cereal', type: 'cereal', x: 7, y: 7, w: 2, d: 1, height: 1, label: 'The cereal station', action: 'cereal', target: { x: 7.5, y: 8.25 } },
  { id: 'table', type: 'table', x: 10, y: 7, w: 2, d: 2, height: 1 },
  { id: 'ideas', type: 'desk-small', x: 5, y: 4, w: 3, d: 2, height: 1, label: 'Room for a cofounder', target: { x: 6, y: 6.25 } },
  // ── Parkour shortcut tables ────────────────────────────────────────────
  // Vault these with Space to skip the long way around
  { id: 'vault-a', type: 'table-vault', x: 8, y: 2, w: 2, d: 1, height: 1, label: 'Vault to the workstation ⬆' },
  { id: 'vault-b', type: 'table-vault', x: 3, y: 4, w: 1, d: 2, height: 1, label: 'Vault across the corridor ➡' },
  { id: 'vault-c', type: 'table-vault', x: 8, y: 6, w: 2, d: 1, height: 1, label: 'Vault to the lounge ⬇' },
  // ── Generator + cycling machine ──────────────────────────────────────────
  { id: 'generator', type: 'generator', x: 12, y: 8, w: 1, d: 1, height: 1, label: 'Power generator', action: 'generator', target: { x: 11.5, y: 9.5 } },
  { id: 'bike',      type: 'cycling-machine', x: 12, y: 9, w: 2, d: 2, height: 1, label: 'Cycling machine', action: 'bike', target: { x: 14.5, y: 10 } },
  { id: 'lightswitch', type: 'light-switch', x: 15, y: 4, w: 1, d: 1, height: 1, label: 'Light switch', action: 'lightswitch', target: { x: 14, y: 4.5 } },
  // ── Floor lamp ───────────────────────────────────────────────────────────
  { id: 'lamp', type: 'lamp', x: 9, y: 9, w: 1, d: 1, height: 2, label: 'Floor lamp', action: 'lamp', target: { x: 9, y: 8.5 } },
  // ── Second hire desk (unlocked by hiring) ────────────────────────────────
  { id: 'ideas2', type: 'desk-small', x: 5, y: 1, w: 3, d: 2, height: 1, label: 'Another desk', target: { x: 6, y: 3.25 } },
  // ── Treadmill ─────────────────────────────────────────────────────────────
  { id: 'treadmill', type: 'treadmill', x: 8, y: 0, w: 2, d: 1, height: 1, label: 'Treadmill · Train your stamina', action: 'treadmill', target: { x: 9, y: 1.5 } },
  // ── Food ordering phone ────────────────────────────────────────────────────
  { id: 'phone', type: 'phone', x: 7, y: 9, w: 1, d: 1, height: 1, label: 'Order delivery food 🍕', action: 'order', target: { x: 7.5, y: 10.25 } },
];

export function project(x, y, z = 0) {
  return { x: x * TILE_SIZE, y: y * TILE_SIZE - z * TILE_SIZE * 0.5 };
}

export function unproject(x, y) {
  return { x: x / TILE_SIZE, y: y / TILE_SIZE };
}

export function isWalkable(x, y, objects = OBJECTS) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const r = FOUNDER_RADIUS;
  if (x < r || y < r || x > ROOM.width - r || y > ROOM.depth - r) return false;
  const pad = 0.05;
  return !objects.some((o) => x > o.x - pad && x < o.x + o.w + pad && y > o.y - pad && y < o.y + o.d + pad);
}

export function canTravel(from, to, objects = OBJECTS) {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 0.07));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    if (!isWalkable(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, objects)) return false;
  }
  return true;
}

// A* on a quarter-tile grid, followed by collision-tested line-of-sight smoothing.
export function nearestWalkable(tx, ty, objects = OBJECTS) {
  if (isWalkable(tx, ty, objects)) return { x: tx, y: ty };
  // Spiral outward in quarter-tile steps until we find a walkable point
  const step = 0.25;
  for (let r = step; r <= 3; r += step) {
    let best = null, bestDist = Infinity;
    const n = Math.ceil((r * 2) / step);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      for (const [cx, cy] of [
        [tx - r + t * r * 2, ty - r],
        [tx + r, ty - r + t * r * 2],
        [tx + r - t * r * 2, ty + r],
        [tx - r, ty + r - t * r * 2],
      ]) {
        const rx = Math.round(cx / step) * step;
        const ry = Math.round(cy / step) * step;
        if (!isWalkable(rx, ry, objects)) continue;
        const d = Math.hypot(rx - tx, ry - ty);
        if (d < bestDist) { best = { x: rx, y: ry }; bestDist = d; }
      }
    }
    if (best) return best;
  }
  return null;
}

export function findPath(from, to, objects = OBJECTS) {
  if (!isWalkable(from.x, from.y, objects) || !isWalkable(to.x, to.y, objects)) return null;
  if (canTravel(from, to, objects)) return [{ ...to }];
  const step = 0.25;
  const key = (x, y) => `${x},${y}`;
  const point = (node) => ({ x: node.x * step, y: node.y * step });
  const neighbors = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let start = null;
  let nearest = Infinity;
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const node = { x: Math.round(from.x / step) + dx, y: Math.round(from.y / step) + dy };
      const p = point(node);
      const distance = Math.hypot(p.x - from.x, p.y - from.y);
      if (distance < nearest && canTravel(from, p, objects)) { start = node; nearest = distance; }
    }
  }
  if (!start) return null;
  const heuristic = (node) => Math.hypot(node.x * step - to.x, node.y * step - to.y);
  start.g = nearest;
  start.f = nearest + heuristic(start);
  const open = [start];
  const nodes = new Map([[key(start.x, start.y), start]]);
  const closed = new Set();
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const currentKey = key(current.x, current.y);
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);
    if (heuristic(current) < step * 1.6 && canTravel(point(current), to, objects)) {
      const raw = [{ ...to }];
      let cursor = current;
      while (cursor) { raw.push(point(cursor)); cursor = cursor.parent; }
      raw.push({ ...from });
      raw.reverse();
      const smooth = [];
      let anchor = 0;
      while (anchor < raw.length - 1) {
        let next = raw.length - 1;
        while (next > anchor + 1 && !canTravel(raw[anchor], raw[next], objects)) next--;
        smooth.push(raw[next]);
        anchor = next;
      }
      return smooth;
    }
    for (const [dx, dy] of neighbors) {
      const x = current.x + dx;
      const y = current.y + dy;
      const id = key(x, y);
      if (closed.has(id)) continue;
      const p = { x: x * step, y: y * step };
      if (!canTravel(point(current), p, objects)) continue;
      const g = current.g + Math.hypot(dx, dy) * step;
      const existing = nodes.get(id);
      if (existing && existing.g <= g) continue;
      const node = { x, y, g, f: g + Math.hypot(p.x - to.x, p.y - to.y), parent: current };
      nodes.set(id, node);
      open.push(node);
    }
  }
  return null;
}

export const TASKS = ['walk', 'coffee', 'cereal', 'plan', 'work', 'parkour', 'sleep'];

// Object types that are small enough to vault over (1×1 or 1×1 footprint)
export const VAULTABLE_TYPES = new Set(['chair', 'plant', 'pills', 'peptide', 'table', 'table-vault', 'desk', 'desk-small']);
export const SAVE_KEY = 'zero-to-one-save-v2';

export const DAY_PROGRESS = [
  { workTitle:'Hello, possibility.', workEyebrow:'YOUR WORKSTATION',
    workDesc:'A blank document. A blinking cursor. A little bit of courage. You don\'t have to build the whole company today. Just make a start.',
    workDetail:'−12 energy · Build your first tiny prototype', workAction:'Make something real',
    workToast:'One tiny prototype, one very real beginning. −12 energy 💻',
    workEarnings: 50,
    planDetail:'Today\'s big idea: make something people need.',
    planToast:'Your first idea is on the board. Small is a great place to start.' },
  { workTitle:'Day two. Still here.', workEyebrow:'YOUR WORKSTATION',
    workDesc:'Yesterday\'s prototype is rougher than you remembered. That\'s fine. Today you make it slightly less rough. That\'s how this works.',
    workDetail:'−12 energy · Improve the prototype', workAction:'Keep building',
    workToast:'A little better every day. That\'s the whole plan. −12 energy 🔧',
    workEarnings: 120,
    planDetail:'Day 2 goal: find one real user to talk to.',
    planToast:'Talking to users beats talking to yourself. Good call.' },
  { workTitle:'Iteration is the job.', workEyebrow:'YOUR WORKSTATION',
    workDesc:'You got some feedback. Most of it stings a little. That\'s actually the good kind — it means someone cared enough to be honest.',
    workDetail:'−12 energy · Apply user feedback', workAction:'Make it better',
    workToast:'User feedback shipped. It hurts, then it helps. −12 energy 📝',
    workEarnings: 250,
    planDetail:'Day 3: turn feedback into features.',
    planToast:'Good feedback turned into a real improvement.' },
  { workTitle:'Building momentum.', workEyebrow:'YOUR WORKSTATION',
    workDesc:'The prototype is starting to look like a thing. Not a finished thing. But a thing. People could use this — if they squinted a little.',
    workDetail:'−12 energy · Polish the core flow', workAction:'Tighten it up',
    workToast:'The core flow is clean. Ship-worthy is getting closer. −12 energy ✨',
    workEarnings: 500,
    planDetail:'Day 4: make the main thing work end-to-end.',
    planToast:'End-to-end works. That\'s a milestone worth celebrating.' },
  { workTitle:'Halfway there.', workEyebrow:'YOUR WORKSTATION',
    workDesc:'Five days in. The idea has survived contact with reality, which is more than most ideas manage. Now make it worth showing to strangers.',
    workDetail:'−12 energy · Prepare a demo', workAction:'Build the demo',
    workToast:'Demo ready. Now go show it to someone who doesn\'t know you. −12 energy 🎯',
    workEarnings: 900,
    planDetail:'Day 5: build something demoable.',
    planToast:'A real demo. You\'ve come a long way from day one.' },
  { workTitle:'People are watching.', workEyebrow:'YOUR WORKSTATION',
    workDesc:'The demo landed. Someone said "I\'d pay for that." You didn\'t faint. Good. Now build the thing they\'d actually pay for.',
    workDetail:'−12 energy · Build the paid features', workAction:'Build the real thing',
    workToast:'Core paid features in. The revenue dream is getting real. −12 energy 💰',
    workEarnings: 1500,
    planDetail:'Day 6: figure out what people will pay for.',
    planToast:'Pricing strategy locked in. The business is taking shape.' },
  { workTitle:'Almost a product.', workEyebrow:'YOUR WORKSTATION',
    workDesc:'It\'s not a prototype anymore. It\'s not quite a product. It\'s in that awkward in-between stage where everything is both exciting and terrifying.',
    workDetail:'−12 energy · Fix the last rough edges', workAction:'Sand the edges',
    workToast:'The rough edges are gone. It\'s starting to feel polished. −12 energy 🪄',
    workEarnings: 2200,
    planDetail:'Day 7: make it feel like a real product.',
    planToast:'Product quality achieved. Not bad for week one.' },
  { workTitle:'Launch prep begins.', workEyebrow:'YOUR WORKSTATION',
    workDesc:'Two days from launch. The code is mostly good. The copy is mostly good. You are mostly fine. This is exactly what it\'s supposed to feel like.',
    workDetail:'−12 energy · Prep for launch', workAction:'Get launch-ready',
    workToast:'Launch checklist almost done. Two days to go. −12 energy 🚀',
    workEarnings: 3000,
    planDetail:'Day 8: write the launch plan.',
    planToast:'Launch plan written. Now you just have to do it.' },
  { workTitle:'One more day.', workEyebrow:'YOUR WORKSTATION',
    workDesc:'Tomorrow you ship. Tonight you\'re fixing that one last bug you told yourself you\'d fix. You always knew you would. Here you are.',
    workDetail:'−12 energy · Final polish', workAction:'Final push',
    workToast:'Final polish done. It\'s as ready as it\'s going to get. −12 energy 🎉',
    workEarnings: 4000,
    planDetail:'Day 9: fix the one last thing.',
    planToast:'One last thing fixed. There\'s always one more — but not today.' },
  { workTitle:'This is it.', workEyebrow:'LAUNCH DAY 🚀',
    workDesc:'Ten days ago it was a blank document. Today it\'s a product. Real users. Real value. You built this. Go ahead and ship it.',
    workDetail:'−12 energy · Ship version 1.0', workAction:'Launch v1.0 🚀',
    workToast:'LAUNCHED. v1.0 is live. You built a startup in ten days. ✨🚀',
    workEarnings: 5000,
    planDetail:'Day 10: ship it. No more waiting.',
    planToast:'Launch plan locked. The world is about to see your work.' },
];

// ── Worker upgrade costs (indexed by target level, so [1] = cost to reach level 2) ──
export const WORKER_UPGRADE_COSTS = [0, 500, 2000]; // level 1 is free; level 2 = $500; level 3 = $2000

// ── Founder upgrade catalogue ─────────────────────────────────────────────
export const FOUNDER_UPGRADES = [
  {
    id: 'focus',
    name: 'Focus Mode',
    emoji: '🎯',
    cost: 300,
    description: 'A custom workspace setup that cuts distractions. Work sessions cost 4 less energy.',
    effect: 'Work costs 8 energy instead of 12',
  },
  {
    id: 'speeddesk',
    name: 'Speed Desk',
    emoji: '⚡',
    cost: 800,
    description: 'Dual monitors, mechanical keyboard, the works. Your output per session goes up 50%.',
    effect: 'Work earns 1.5× money per session',
  },
  {
    id: 'deepwork',
    name: 'Deep Work Protocol',
    emoji: '🧠',
    cost: 2000,
    description: 'Time-blocked, phone-free, flow-state guaranteed. Double output and you actually gain energy.',
    effect: 'Work earns 2× money · Restores 5 energy instead of costing 12',
  },
];
// earningsPerTick: dollars earned per real-second while actively working
export const WORKER_ROLES = [
  { role: 'Engineer',   emoji: '👩‍💻', earningsPerTick: 3,  color: '#5888e8', description: 'Writes clean code. Asks good questions. Earns quietly in the background.' },
  { role: 'Designer',   emoji: '🎨', earningsPerTick: 2,  color: '#e858a8', description: 'Makes everything look considered. Turns rough ideas into something real.' },
  { role: 'Growth',     emoji: '📈', earningsPerTick: 4,  color: '#58e870', description: 'Knows the numbers cold. Finds the lever no one else saw.' },
  { role: 'Operations', emoji: '⚙️', earningsPerTick: 2,  color: '#e8a030', description: 'Keeps the lights on. Usually literally.' },
];

// ── Candidate pool per day (2 random candidates generated from WORKER_ROLES)
// Deterministic by day so refresh doesn't change candidates mid-day.
export function getCandidates(day) {
  const names = ['Morgan','Jamie','Riley','Casey','Jordan','Alex','Sam','Taylor','Drew','Quinn'];
  const out = [];
  for (let i = 0; i < 2; i++) {
    const nameIdx  = (day * 7 + i * 13) % names.length;
    const roleIdx  = (day * 3 + i * 5)  % WORKER_ROLES.length;
    const role     = WORKER_ROLES[roleIdx];
    out.push({ name: names[nameIdx], role: role.role, emoji: role.emoji, earningsPerTick: role.earningsPerTick, color: role.color, description: role.description });
  }
  return out;
}

export function newState() {
  return { version: 3, founder: { ...START }, energy: 80, elec: 100, money: 0, minutes: 540, completed: [], distance: 0, sound: false, day: 1, lightOn: true, lampOn: true, workers: [], founderUpgrades: [], cerealStock: 0, treadmillSessions: 0, staminaLevel: 1, staminaWorkoutsAtLevel: 0 };
}

export function parseSave(raw) {
  const fresh = newState();
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 3) return fresh;
    if (value.founder && isWalkable(value.founder.x, value.founder.y)) fresh.founder = { x: value.founder.x, y: value.founder.y };
    if (Number.isFinite(value.energy)) fresh.energy = Math.max(0, Math.min(100, value.energy));
    if (Number.isFinite(value.elec))   fresh.elec   = Math.max(0, Math.min(100, value.elec));
    if (Number.isFinite(value.minutes)) fresh.minutes = Math.max(540, Math.min(1079, value.minutes));
    if (Number.isFinite(value.distance)) fresh.distance = Math.max(0, Math.min(100000, value.distance));
    if (Array.isArray(value.completed)) fresh.completed = TASKS.filter((id) => id !== 'sleep' && value.completed.includes(id));
    fresh.sound = value.sound === true;
    fresh.lightOn = value.lightOn !== false; // default to true if missing
    fresh.lampOn = value.lampOn !== false;   // default to true if missing
    if (Number.isFinite(value.day)) fresh.day = Math.max(1, Math.min(10, value.day));
    if (Number.isFinite(value.money)) fresh.money = Math.max(0, value.money);
    if (Array.isArray(value.workers)) {
      fresh.workers = value.workers.filter(w =>
        w && typeof w.name === 'string' && typeof w.role === 'string' &&
        Number.isFinite(w.earningsPerTick) && Number.isFinite(w.deskIndex)
      ).map(w => ({ ...w, level: Number.isFinite(w.level) ? Math.max(1, Math.min(3, w.level)) : 1, onStrike: w.onStrike === true, strikeCountdown: Number.isFinite(w.strikeCountdown) ? Math.max(0, w.strikeCountdown) : 0 }))
       .slice(0, 2); // max 2 workers
    }
    if (Array.isArray(value.founderUpgrades)) {
      const validIds = new Set(['focus', 'speeddesk', 'deepwork']);
      fresh.founderUpgrades = value.founderUpgrades.filter(id => validIds.has(id));
    }
    if (Number.isFinite(value.cerealStock)) fresh.cerealStock = Math.max(0, Math.min(3, Math.floor(value.cerealStock)));
    if (Number.isFinite(value.treadmillSessions)) fresh.treadmillSessions = Math.max(0, Math.floor(value.treadmillSessions));
    if (Number.isFinite(value.staminaLevel)) fresh.staminaLevel = Math.max(1, Math.min(5, Math.floor(value.staminaLevel)));
    if (Number.isFinite(value.staminaWorkoutsAtLevel)) fresh.staminaWorkoutsAtLevel = Math.max(0, Math.floor(value.staminaWorkoutsAtLevel));
    return fresh;
  } catch { return fresh; }
}
