import test from "node:test";
import assert from "node:assert/strict";
import {
  nextHandIndex,
  selectedHandIndex,
  shouldRestoreHandFocus,
} from "./hand-controls.js";

test("hand navigation tracks duplicate tiles by physical position", () => {
  const hand = ["1m", "2m", "2m", "3m"];
  assert.equal(selectedHandIndex(hand.length, 2), 2);
  assert.equal(nextHandIndex(hand.length, 2, "ArrowRight"), 3);
  assert.equal(nextHandIndex(hand.length, 2, "ArrowLeft"), 1);
  assert.equal(nextHandIndex(hand.length, 2, "Home"), 0);
  assert.equal(nextHandIndex(hand.length, 2, "End"), 3);
  assert.equal(nextHandIndex(hand.length, 3, "ArrowRight"), 0);
});

test("focus restoration does not override Settings or discard-history interaction", () => {
  assert.equal(shouldRestoreHandFocus("hand"), true);
  assert.equal(shouldRestoreHandFocus("body"), true);
  assert.equal(shouldRestoreHandFocus("settings"), false);
  assert.equal(shouldRestoreHandFocus("discard-history"), false);
});
