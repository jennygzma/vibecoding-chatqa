import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OBJECTS,
  ROOM,
  START,
  TASKS,
  project,
  unproject,
  isWalkable,
  canTravel,
  findPath,
  newState,
  parseSave,
} from '../public/js/world.js';

test('top-down projection round-trips floor coordinates', () => {
  for (const [x, y] of [[0, 0], [16, 12], [3.2, 8.1], [-2, 3]]) {
    const screen = project(x, y);
    const result = unproject(screen.x, screen.y);
    assert.ok(Math.abs(result.x - x) < 1e-10);
    assert.ok(Math.abs(result.y - y) < 1e-10);
  }
  assert.deepEqual(project(1, 1, 1), { x: 32, y: 16 });
});

test('start and every interaction target are collision-free', () => {
  assert.ok(isWalkable(START.x, START.y), 'start');
  for (const point of [[0, 0], [-1, 5], [16, 4], [4, 12], [NaN, 5], [5, Infinity]]) {
    assert.equal(isWalkable(...point), false);
  }
  for (const object of OBJECTS) {
    assert.equal(isWalkable(object.x + object.w / 2, object.y + object.d / 2), false, object.id);
    if (object.target) assert.ok(isWalkable(object.target.x, object.target.y), `${object.id} target`);
  }
});

test('a direct path reaches the exact destination', () => {
  const goal = { x: 3.2, y: 7.8 };
  assert.deepEqual(findPath(START, goal, []), [goal]);
  assert.deepEqual(findPath(START, START, []), [START]);
});

test('A* routes around a solid obstacle without cutting through it', () => {
  const objects = [{ x: 4, y: 3, w: 2, d: 3 }];
  const start = { x: 2, y: 4.5 };
  const goal = { x: 8, y: 4.5 };
  assert.equal(canTravel(start, goal, objects), false);
  const path = findPath(start, goal, objects);
  assert.ok(path && path.length > 1);
  let previous = start;
  for (const point of path) {
    assert.ok(canTravel(previous, point, objects));
    previous = point;
  }
  assert.deepEqual(path.at(-1), goal);
});

test('unreachable destinations return null instead of crossing walls', () => {
  assert.equal(findPath(START, { x: -1, y: 4 }), null);
  assert.equal(findPath({ x: 0, y: 0 }, START), null);
  const wall = [{ x: 5, y: 0, w: 1, d: ROOM.depth }];
  assert.equal(findPath({ x: 2, y: 5 }, { x: 9, y: 5 }, wall), null);
});

test('every interaction target is reachable from the start', () => {
  for (const object of OBJECTS.filter((item) => item.target)) {
    const path = findPath(START, object.target);
    assert.ok(path, `start → ${object.id}`);
    assert.deepEqual(path.at(-1), object.target);
    let previous = START;
    for (const point of path) {
      assert.ok(canTravel(previous, point), `start → ${object.id}: safe segment`);
      previous = point;
    }
  }
});

test('sampled walkable floor locations remain connected', () => {
  for (let x = 0.5; x < ROOM.width; x += 1) {
    for (let y = 0.5; y < ROOM.depth; y += 1) {
      if (!isWalkable(x, y)) continue;
      assert.ok(findPath(START, { x, y }), `reachable floor ${x},${y}`);
    }
  }
});

test('save parsing round-trips final-version progress', () => {
  const state = newState();
  state.completed = ['walk', 'coffee'];
  state.energy = 99;
  state.elec = 77;
  state.money = 1234;
  state.founder = { x: 3, y: 7 };
  state.sound = true;
  state.day = 4;
  state.staminaLevel = 3;
  state.staminaWorkoutsAtLevel = 1;
  assert.deepEqual(parseSave(JSON.stringify(state)), state);
  const other = newState();
  state.completed.push('work');
  assert.deepEqual(other.completed, []);
  for (const raw of [null, 'garbage', '{}', 'null', '{"version":2}']) {
    assert.deepEqual(parseSave(raw), newState());
  }
});

test('corrupted saves are clamped and filtered', () => {
  const state = parseSave(JSON.stringify({
    version: 3,
    founder: { x: 7.5, y: 9.5 },
    energy: 300,
    elec: -10,
    money: -5,
    minutes: -50,
    completed: ['coffee', 'coffee', 'sleep', 'unknown'],
    distance: -1,
    day: 99,
    sound: 'true',
    cerealStock: 20,
    staminaLevel: 12,
    staminaWorkoutsAtLevel: -2,
    founderUpgrades: ['focus', 'forged'],
    workers: [null, { name: 'Maya', role: 'Engineer', earningsPerTick: 3, deskIndex: 0, level: 99 }],
  }));
  assert.deepEqual(state.founder, START);
  assert.equal(state.energy, 100);
  assert.equal(state.elec, 0);
  assert.equal(state.money, 0);
  assert.equal(state.minutes, 540);
  assert.deepEqual(state.completed, ['coffee']);
  assert.equal(state.distance, 0);
  assert.equal(state.day, 10);
  assert.equal(state.sound, false);
  assert.equal(state.cerealStock, 3);
  assert.equal(state.staminaLevel, 5);
  assert.equal(state.staminaWorkoutsAtLevel, 0);
  assert.deepEqual(state.founderUpgrades, ['focus']);
  assert.equal(state.workers.length, 1);
  assert.equal(state.workers[0].level, 3);
  assert.deepEqual(TASKS, ['walk', 'coffee', 'cereal', 'plan', 'work', 'parkour', 'sleep']);
});
