import test from "node:test";
import assert from "node:assert/strict";
import {
  claim,
  claimsFor,
  computerTurn,
  discard,
  newGame,
  pass,
  resolveClaims,
  selectedClaim,
  tsumo,
} from "./game.js";
import { createWall, tileKey } from "./rules.js";
const t = (suit, rank) => ({ suit, rank });
const h = (honor) => ({ suit: "honor", honor });
function stateFor({ hands, turn = 0, lastDiscard = null }) {
  const wall = createWall(() => 0.5),
    take = (want) =>
      wall.splice(
        wall.findIndex((tile) => tileKey(tile) === tileKey(want)),
        1,
      )[0];
  const physicalHands = hands.map((hand) => hand.map(take));
  const tile = lastDiscard && take(lastDiscard.tile);
  return {
    hands: physicalHands,
    melds: [[], [], [], []],
    discards: lastDiscard ? [[], [], [], []] : [[], [], [], []],
    winningTiles: [null, null, null, null],
    wall,
    turn,
    phase: lastDiscard ? "claim" : "discard",
    message: "",
    winner: null,
    lastDiscard: tile && { player: lastDiscard.player, tile },
    awaitingHuman: false,
    passedPlayers: new Set(),
    tsumoEligible: true,
  };
}
function ids(state) {
  return [
    state.wall,
    ...state.hands,
    ...state.melds.flatMap((melds) => melds.map((meld) => meld.tiles)),
    ...state.discards,
    ...state.winningTiles.filter(Boolean).map((tile) => [tile]),
  ]
    .flat()
    .map((tile) => tile.id);
}
function conserved(state) {
  const all = ids(state);
  assert.equal(all.length, 136);
  assert.equal(new Set(all).size, 136);
}
const win = [
  t("bamboo", 1),
  t("bamboo", 2),
  t("bamboo", 3),
  t("characters", 2),
  t("characters", 3),
  t("characters", 4),
  t("dots", 7),
  t("dots", 8),
  t("dots", 9),
  h("east"),
  h("east"),
  h("east"),
  h("red"),
  h("red"),
];
test("tsumo requires East opening eligibility or an actual draw", () => {
  const state = stateFor({ hands: [win, [], [], []] });
  tsumo(state);
  assert.equal(state.phase, "ended");
  const called = stateFor({ hands: [win, [], [], []] });
  called.tsumoEligible = false;
  tsumo(called);
  assert.equal(called.phase, "discard");
});
test("a selected high-priority call suppresses a lower-priority human chii", () => {
  const state = stateFor({
    hands: [
      [t("bamboo", 2), t("bamboo", 3)],
      [],
      [t("bamboo", 1), t("bamboo", 1)],
      [],
    ],
    lastDiscard: { player: 3, tile: t("bamboo", 1) },
  });
  assert.deepEqual(selectedClaim(state), { player: 2, types: ["pon"] });
  resolveClaims(state);
  assert.equal(state.melds[2][0].type, "pon");
  conserved(state);
});
test("passing East ron resolves the remaining West pon", () => {
  const state = stateFor({
    hands: [win.slice(0, 13), [], [h("red"), h("red")], []],
    lastDiscard: { player: 1, tile: h("red") },
  });
  resolveClaims(state);
  assert.deepEqual(selectedClaim(state), { player: 0, types: ["ron"] });
  pass(state);
  resolveClaims(state);
  assert.equal(state.melds[2][0].type, "pon");
  conserved(state);
});
test("pon and ron move real physical tiles without duplication", () => {
  const pon = stateFor({
    hands: [[], [h("north"), h("north")], [], []],
    lastDiscard: { player: 0, tile: h("north") },
  });
  resolveClaims(pon);
  assert.equal(new Set(pon.melds[1][0].tiles.map((tile) => tile.id)).size, 3);
  conserved(pon);
  const ron = stateFor({
    hands: [[], win.slice(0, 13), [], []],
    lastDiscard: { player: 0, tile: h("red") },
  });
  const winningId = ron.lastDiscard.tile.id;
  resolveClaims(ron);
  assert.equal(ron.winningTiles[1].id, winningId);
  assert.equal(ron.phase, "ended");
  conserved(ron);
});
test("no player can claim their own discard", () => {
  const state = stateFor({
    hands: [[t("characters", 4), t("characters", 4)], [], [], []],
    lastDiscard: { player: 0, tile: t("characters", 4) },
  });
  assert.deepEqual(claimsFor(state, 0), {});
});
test("an empty-wall kan retains the exhaustive-draw message", () => {
  const state = stateFor({
    hands: [[], [h("north"), h("north"), h("north")], [], []],
    lastDiscard: { player: 0, tile: h("north") },
  });
  state.wall = [];
  claim(state, 1, "kan");
  assert.equal(state.phase, "ended");
  assert.equal(state.message, "Exhaustive draw — the wall is empty.");
});
test("several complete hands conserve all physical tile IDs", () => {
  for (let seed = 1; seed <= 8; seed += 1) {
    let value = seed;
    const random = () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 2 ** 32;
    };
    const state = newGame(random);
    let steps = 0;
    while (state.phase !== "ended" && steps < 1000) {
      if (state.awaitingHuman) pass(state);
      else if (state.phase === "claim") resolveClaims(state);
      else if (state.turn === 0) discard(state, 0, 0);
      else computerTurn(state);
      conserved(state);
      steps += 1;
    }
    assert.ok(steps < 1000);
    assert.equal(state.phase, "ended");
  }
});
