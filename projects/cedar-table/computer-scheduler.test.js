import test from "node:test";
import assert from "node:assert/strict";
import {
  canScheduleAutomaticComputerStep,
  createComputerScheduler,
} from "./computer-scheduler.js";

function controlledClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    advance(ms) {
      now += ms;
      [...timers.entries()]
        .filter(([, timer]) => timer.when <= now)
        .forEach(([id, timer]) => {
          timers.delete(id);
          timer.callback();
        });
    },
    clearTimer(id) {
      timers.delete(id);
    },
    pending() {
      return timers.size;
    },
    setTimer(callback, delay) {
      const id = nextId;
      nextId += 1;
      timers.set(id, { callback, delay, when: now + delay });
      return id;
    },
  };
}

test("schedules each advertised pace at its exact delay", () => {
  [300, 800, 1500].forEach((delay) => {
    const clock = controlledClock();
    const scheduler = createComputerScheduler(clock);
    let steps = 0;
    scheduler.schedule(delay, () => { steps += 1; });
    clock.advance(delay - 1);
    assert.equal(steps, 0, `${delay} ms should not fire early`);
    assert.equal(scheduler.pending(), true);
    clock.advance(1);
    assert.equal(steps, 1, `${delay} ms should fire exactly on time`);
    assert.equal(scheduler.pending(), false);
  });
});

test("replaces a pending step with one full new pace delay", () => {
  const clock = controlledClock();
  const scheduler = createComputerScheduler(clock);
  let steps = 0;
  scheduler.schedule(800, () => { steps += 1; });
  clock.advance(400);
  scheduler.schedule(1500, () => { steps += 1; });
  assert.equal(clock.pending(), 1);
  clock.advance(1499);
  assert.equal(steps, 0);
  clock.advance(1);
  assert.equal(steps, 1);
});

test("cancelled and stale callbacks cannot create duplicate computer moves", () => {
  let callback;
  let cleared = false;
  const scheduler = createComputerScheduler({
    setTimer(next) {
      callback = next;
      return 1;
    },
    clearTimer() {
      cleared = true;
    },
  });
  let steps = 0;
  scheduler.schedule(300, () => { steps += 1; });
  scheduler.cancel();
  assert.equal(cleared, true);
  callback();
  assert.equal(steps, 0);
});

test("production eligibility permits only automatic claims and computer discards", () => {
  assert.equal(canScheduleAutomaticComputerStep({
    canRun: true, awaitingHuman: false, phase: "claim", turn: 1,
  }), true);
  assert.equal(canScheduleAutomaticComputerStep({
    canRun: true, awaitingHuman: false, phase: "discard", turn: 3,
  }), true);
  [
    ["paused", { canRun: false, awaitingHuman: false, phase: "claim", turn: 1 }],
    ["hidden", { canRun: false, awaitingHuman: false, phase: "discard", turn: 2 }],
    ["waiting for Continue", { canRun: false, awaitingHuman: false, phase: "claim", turn: 1 }],
    ["awaiting a human claim", { canRun: true, awaitingHuman: true, phase: "claim", turn: 1 }],
    ["East discard", { canRun: true, awaitingHuman: false, phase: "discard", turn: 0 }],
    ["finished hand", { canRun: false, awaitingHuman: false, phase: "ended", turn: 1 }],
  ].forEach(([name, state]) => {
    assert.equal(canScheduleAutomaticComputerStep(state), false, name);
  });
});

test("every blocked state cancels a freshly pending automatic callback", () => {
  const clock = controlledClock();
  const scheduler = createComputerScheduler(clock);
  const blockedStates = [
    { canRun: false, awaitingHuman: false, phase: "claim", turn: 1 },
    { canRun: false, awaitingHuman: false, phase: "discard", turn: 2 },
    { canRun: false, awaitingHuman: false, phase: "claim", turn: 1 },
    { canRun: true, awaitingHuman: true, phase: "claim", turn: 1 },
    { canRun: true, awaitingHuman: false, phase: "discard", turn: 0 },
    { canRun: false, awaitingHuman: false, phase: "ended", turn: 1 },
  ];
  blockedStates.forEach((state) => {
    scheduler.schedule(800, () => {});
    assert.equal(scheduler.pending(), true);
    if (!canScheduleAutomaticComputerStep(state)) scheduler.cancel();
    assert.equal(scheduler.pending(), false);
    assert.equal(clock.pending(), 0);
  });
});

test("resuming after cancellation starts a full fresh delay", () => {
  const clock = controlledClock();
  const scheduler = createComputerScheduler(clock);
  let steps = 0;
  scheduler.schedule(800, () => { steps += 1; });
  clock.advance(500);
  scheduler.cancel();
  scheduler.schedule(800, () => { steps += 1; });
  clock.advance(799);
  assert.equal(steps, 0);
  clock.advance(1);
  assert.equal(steps, 1);
});
