import test from "node:test";
import assert from "node:assert/strict";
import {
  applyComputerPaceChange,
  COMPUTER_PACE_KEY,
  DEFAULT_COMPUTER_PACE,
  loadComputerPace,
  saveComputerPace,
} from "./computer-pace.js";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

test("computer pace defaults to Normal and accepts only known preferences", () => {
  const local = storage();
  assert.equal(loadComputerPace(local), DEFAULT_COMPUTER_PACE);
  local.setItem(COMPUTER_PACE_KEY, "fast");
  assert.equal(loadComputerPace(local), "fast");
  local.setItem(COMPUTER_PACE_KEY, "too-fast");
  assert.equal(loadComputerPace(local), DEFAULT_COMPUTER_PACE);
  assert.deepEqual(saveComputerPace(local, "slow"), { ok: true, pace: "slow" });
  assert.equal(local.getItem(COMPUTER_PACE_KEY), "slow");
  assert.deepEqual(saveComputerPace(local, "invalid"), { ok: true, pace: "normal" });
  assert.equal(local.getItem(COMPUTER_PACE_KEY), "normal");
});

test("computer pace handles unavailable preference storage", () => {
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(loadComputerPace(blocked), DEFAULT_COMPUTER_PACE);
  assert.deepEqual(saveComputerPace(blocked, "fast"), { ok: false, pace: "fast" });
  assert.deepEqual(saveComputerPace(null, "slow"), { ok: false, pace: "slow" });
});

test("applies a page-local pace and clears its separate notice after a later save", () => {
  const blocked = { setItem() { throw new Error("blocked"); } };
  assert.deepEqual(applyComputerPaceChange(blocked, "slow"), {
    pace: "slow",
    notice: "Computer pace will apply for this page, but could not be saved.",
  });
  assert.deepEqual(applyComputerPaceChange(storage(), "fast"), {
    pace: "fast",
    notice: "",
  });
});
