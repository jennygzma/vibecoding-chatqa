import test from "node:test";
import assert from "node:assert/strict";
import { createClaimController } from "./claim-controller.js";

function controlledTimers() {
  let nextId = 1;
  const callbacks = new Map();
  return {
    setTimer(callback) {
      const id = nextId++;
      callbacks.set(id, callback);
      return id;
    },
    clearTimer(id) {
      callbacks.delete(id);
    },
    runAll() {
      for (const callback of [...callbacks.values()]) callback();
      callbacks.clear();
    },
    get size() {
      return callbacks.size;
    },
  };
}

function controllerFor(state, hasUserClaim = () => false) {
  const timers = controlledTimers();
  let settlements = 0;
  const controller = createClaimController({
    getState: () => state,
    hasUserClaim,
    settle: () => settlements++,
    setTimer: (callback) => timers.setTimer(callback),
    clearTimer: (id) => timers.clearTimer(id),
  });
  return { controller, timers, get settlements() { return settlements; } };
}

test("a computer discard with no human claim settles automatically", () => {
  const flow = controllerFor({ phase: "claim", lastDiscarder: 1 });
  assert.equal(flow.controller.resume(650), true);
  assert.equal(flow.timers.size, 1);
  flow.timers.runAll();
  assert.equal(flow.settlements, 1);
});

test("a real human claim window waits for the human decision", () => {
  const flow = controllerFor(
    { phase: "claim", lastDiscarder: 1 },
    () => true,
  );
  assert.equal(flow.controller.resume(650), false);
  assert.equal(flow.timers.size, 0);
  flow.timers.runAll();
  assert.equal(flow.settlements, 0);
});

test("starting a new hand cancels a pending automatic settlement", () => {
  const state = { phase: "claim", lastDiscarder: 2 };
  const flow = controllerFor(state);
  flow.controller.resume(650);
  flow.controller.cancel();
  state.phase = "discard";
  flow.timers.runAll();
  assert.equal(flow.settlements, 0);
});
