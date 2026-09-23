import test from "node:test";
import assert from "node:assert/strict";
import { createDiscardSelection } from "./discard-selection.js";
import { discard } from "./game.js";

const tile = (id, rank) => ({ id, suit: "bamboo", rank });
function stateFor(hand, { phase = "discard", turn = 0, awaitingHuman = false } = {}) {
  return { hands: [hand], phase, turn, awaitingHuman };
}

test("selects one exact physical tile among duplicate faces and permits reselection", () => {
  const first = tile("bamboo-4-0", 4);
  const second = tile("bamboo-4-1", 4);
  const state = stateFor([first, second]);
  const selection = createDiscardSelection();

  assert.equal(selection.select(state, second.id, true), second);
  assert.equal(selection.selected(state), second);
  assert.equal(selection.select(state, second.id, true), second);
  assert.equal(selection.selected(state), second);
  assert.equal(selection.select(state, first.id, true), first);
  assert.equal(selection.confirm(state, true), 0);
});

test("rejects stale IDs and revalidates the current East discard turn before confirmation", () => {
  const chosen = tile("bamboo-6-0", 6);
  const other = tile("bamboo-7-0", 7);
  const state = stateFor([chosen, other]);
  const selection = createDiscardSelection();

  selection.select(state, chosen.id, true);
  state.hands[0] = [other];
  assert.equal(selection.confirm(state, true), -1);
  assert.equal(selection.selected(state), null);

  selection.select(state, other.id, true);
  state.turn = 1;
  assert.equal(selection.confirm(state, true), -1);
  assert.equal(selection.selected(state), null);
});

test("rejects selection and confirmation when the current activity gate is false", () => {
  const chosen = tile("bamboo-3-0", 3);
  const state = stateFor([chosen]);
  const selection = createDiscardSelection();

  assert.equal(selection.select(state, chosen.id, false), null);
  assert.equal(selection.selected(state), null);
  selection.select(state, chosen.id, true);
  assert.equal(selection.confirm(state, false), -1);
  assert.equal(selection.selected(state), null);
  assert.deepEqual(state.hands[0], [chosen]);
});

test("confirmation resolves a selected physical ID at its current reordered hand index", () => {
  const chosen = tile("bamboo-8-0", 8);
  const other = tile("bamboo-2-0", 2);
  const state = stateFor([chosen, other]);
  const selection = createDiscardSelection();

  selection.select(state, chosen.id, true);
  state.hands[0] = [other, chosen];
  assert.equal(selection.confirm(state, true), 1);
});

test("cancel leaves the hand unchanged while valid ordinary reads preserve selection", () => {
  const chosen = tile("bamboo-8-0", 8);
  const state = stateFor([chosen]);
  const selection = createDiscardSelection();

  selection.select(state, chosen.id, true);
  assert.equal(selection.selected(state), chosen);
  assert.equal(selection.selected(state), chosen);
  selection.cancel();
  assert.equal(selection.selected(state), null);
  assert.deepEqual(state.hands[0], [chosen]);

  selection.select(state, chosen.id, true);
  selection.cancel();
  assert.equal(selection.selected(state), null);
  assert.deepEqual(state.hands[0], [chosen]);
});

test("confirmation is consumed at most once before and across the real discard transition", () => {
  const chosen = tile("bamboo-9-0", 9);
  const state = {
    ...stateFor([chosen]),
    discards: [[], [], [], []],
    passedPlayers: new Set(),
    tsumoEligible: true,
    message: "",
  };
  const selection = createDiscardSelection();

  selection.select(state, chosen.id, true);
  const index = selection.confirm(state, true);
  assert.equal(index, 0);
  assert.equal(selection.confirm(state, true), -1);
  assert.deepEqual(state.hands[0], [chosen]);
  assert.deepEqual(state.discards[0], []);
  discard(state, 0, index);
  assert.deepEqual(state.hands[0], []);
  assert.deepEqual(state.discards[0], [chosen]);
});

test("selection is unavailable outside East's active legal discard turn", () => {
  const chosen = tile("bamboo-1-0", 1);
  const selection = createDiscardSelection();

  [
    stateFor([chosen], { turn: 1 }),
    stateFor([chosen], { phase: "claim" }),
    stateFor([chosen], { awaitingHuman: true }),
  ].forEach((state) => assert.equal(selection.select(state, chosen.id, true), null));
});
