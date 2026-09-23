import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeDiscardWaits,
  canChii,
  canKan,
  canPon,
  chiiOptions,
  createWall,
  isWinningHand,
  isWinningHandWithMelds,
  tileKey,
} from "./rules.js";
const t = (suit, rank) => ({ suit, rank });
const h = (honor) => ({ suit: "honor", honor });
test("wall contains 136 tiles, four of every type", () => {
  const wall = createWall(() => 0.5);
  assert.equal(wall.length, 136);
  assert.equal(
    wall.filter((x) => x.suit === "honor" && x.honor === "east").length,
    4,
  );
});
test("recognizes a standard four-meld and pair win regardless of tile order", () => {
  const hand = [
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
  assert.equal(isWinningHand(hand), true);
  assert.equal(isWinningHand([...hand.slice(1), hand[0]]), true);
  assert.equal(isWinningHand(hand.slice(0, 13)), false);
});
test("recognizes a standard win with one exposed meld", () => {
  const concealed = [
    t("bamboo", 1),
    t("bamboo", 2),
    t("bamboo", 3),
    t("characters", 2),
    t("characters", 3),
    t("characters", 4),
    h("east"),
    h("east"),
    h("east"),
    h("red"),
    h("red"),
  ];
  assert.equal(isWinningHandWithMelds(concealed, 1), true);
});
test("allows only legal basic claims", () => {
  const hand = [
    t("bamboo", 2),
    t("bamboo", 3),
    t("dots", 5),
    t("dots", 5),
    t("dots", 5),
  ];
  assert.equal(canChii(hand, t("bamboo", 1)), true);
  assert.deepEqual(chiiOptions(hand, t("bamboo", 1)), [[2, 3]]);
  assert.equal(canChii(hand, h("east")), false);
  assert.equal(canPon(hand, t("dots", 5)), true);
  assert.equal(canKan(hand, t("dots", 5)), true);
});
test("analyzes standard discard waits without mutating or using hidden tiles", () => {
  const hand = [
    t("bamboo", 1), t("bamboo", 2), t("bamboo", 3),
    t("characters", 2), t("characters", 3), t("characters", 4),
    t("dots", 7), t("dots", 8), t("dots", 9),
    h("east"), h("east"), h("east"), h("red"), h("red"),
  ];
  const melds = [[], [], [], []];
  const discards = [[], [], [], []];
  const before = structuredClone({ hand, melds, discards });
  const hints = analyzeDiscardWaits(hand, melds, discards);
  assert.deepEqual(before, { hand, melds, discards });
  assert.deepEqual(
    hints.find((hint) => hint.discard.suit === "dots" && hint.discard.rank === 7)?.winningTiles.map(tileKey),
    ["dots:7"],
  );
  const hiddenInformation = {
    opponentHands: [[h("north")], [h("south")], [h("west")]],
    wall: [t("dots", 1)],
  };
  const beforeHiddenChange = analyzeDiscardWaits(hand, melds, discards);
  hiddenInformation.opponentHands[0].push(t("bamboo", 1));
  hiddenInformation.wall.push(h("red"));
  const afterHiddenChange = analyzeDiscardWaits(hand, melds, discards);
  assert.deepEqual(afterHiddenChange, beforeHiddenChange);
});
test("analyzes waits with exposed melds and a kan", () => {
  const hand = [
    t("bamboo", 1), t("bamboo", 2), t("bamboo", 3),
    t("characters", 2), t("characters", 3), t("characters", 4),
    h("east"), h("east"), h("east"), h("red"), h("red"),
  ];
  const melds = [[{ type: "kan", tiles: [t("dots", 9), t("dots", 9), t("dots", 9), t("dots", 9)] }], [], [], []];
  const hints = analyzeDiscardWaits(hand, melds, [[], [], [], []]);
  assert.deepEqual(
    hints.find((hint) => tileKey(hint.discard) === "bamboo:1")?.winningTiles.map(tileKey),
    ["bamboo:1", "bamboo:4"],
  );
});
test("removes only an exhausted wait from a legal 14-tile hand", () => {
  const hand = [
    t("bamboo", 1), t("bamboo", 2), t("bamboo", 3),
    t("characters", 2), t("characters", 3), t("characters", 4),
    t("dots", 7), t("dots", 8), t("dots", 9),
    h("east"), h("east"), h("east"), h("red"), h("red"),
  ];
  const waitsForBambooOne = (discards) =>
    analyzeDiscardWaits(hand, [[], [], [], []], discards)
      .find((hint) => tileKey(hint.discard) === "bamboo:1")
      ?.winningTiles.map(tileKey);
  assert.deepEqual(waitsForBambooOne([[], [], [], []]), ["bamboo:1", "bamboo:4"]);
  assert.deepEqual(
    waitsForBambooOne([[{ id: "b1b", ...t("bamboo", 1) }], [{ id: "b1c", ...t("bamboo", 1) }], [{ id: "b1d", ...t("bamboo", 1) }], []]),
    ["bamboo:4"],
  );
});
test("deduplicates repeated discard candidates with a nonempty result", () => {
  const hand = [
    t("bamboo", 1), t("bamboo", 2), t("bamboo", 3),
    t("characters", 2), t("characters", 3), t("characters", 4),
    t("dots", 7), t("dots", 8), t("dots", 9),
    h("east"), h("east"), h("red"), h("red"), h("red"),
  ];
  const hints = analyzeDiscardWaits(hand, [[], [], [], []], [[], [], [], []]);
  assert.deepEqual(
    hints.filter((hint) => tileKey(hint.discard) === "h:red").map((hint) => hint.winningTiles.map(tileKey)),
    [["h:east", "h:red"]],
  );
});
test("counts repeated visible IDs once but distinct physical copies separately", () => {
  const hand = [
    { id: "b1a", ...t("bamboo", 1) }, t("bamboo", 2), t("bamboo", 3),
    t("characters", 2), t("characters", 3), t("characters", 4),
    t("dots", 7), t("dots", 8), t("dots", 9),
    h("east"), h("east"), h("east"), h("red"), h("red"),
  ];
  const waitsForBambooOne = (discards) =>
    analyzeDiscardWaits(hand, [[], [], [], []], discards)
      .find((hint) => tileKey(hint.discard) === "bamboo:1")
      ?.winningTiles.map(tileKey);
  const repeated = { id: "b1b", ...t("bamboo", 1) };
  assert.deepEqual(waitsForBambooOne([[repeated, repeated, repeated], [], [], []]), ["bamboo:1", "bamboo:4"]);
  assert.deepEqual(
    waitsForBambooOne([[{ id: "b1b", ...t("bamboo", 1) }, { id: "b1c", ...t("bamboo", 1) }, { id: "b1d", ...t("bamboo", 1) }], [], [], []]),
    ["bamboo:4"],
  );
});
test("returns no hints when no discard creates a standard wait", () => {
  const hand = [
    h("east"), h("east"), h("south"), h("south"), h("west"), h("west"),
    h("north"), h("north"), h("white"), h("white"), h("green"), h("green"),
    h("red"), h("red"),
  ];
  assert.deepEqual(analyzeDiscardWaits(hand, [[], [], [], []], [[], [], [], []]), []);
});
test("rejects seven-pairs as outside the compact ruleset", () => {
  const hand = [
    "east",
    "east",
    "south",
    "south",
    "west",
    "west",
    "north",
    "north",
    "white",
    "white",
    "green",
    "green",
    "red",
    "red",
  ].map(h);
  assert.equal(isWinningHand(hand), false);
});
