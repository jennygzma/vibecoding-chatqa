import test from "node:test";
import assert from "node:assert/strict";
import {
  createWall,
  chooseDiscard,
  isTileCode,
  isWinningHand,
  canRon,
  canPon,
  chiOptions,
  legalClaims,
  removeTiles,
  seatNames,
} from "./game.js";
import {
  canSelfDraw,
  claimChoices,
  chooseClaim,
  settleClaims,
  applySettlement,
  discardTransition,
  drawTransition,
  isValidRound,
} from "./transitions.js";
import { isValidSavedRound } from "./persistence.js";

const complete = [
  "1m",
  "2m",
  "3m",
  "4p",
  "5p",
  "6p",
  "7s",
  "8s",
  "9s",
  "E",
  "E",
  "E",
  "R",
  "R",
];

test("recognizes four sets and a pair", () =>
  assert.equal(isWinningHand(complete), true));
test("recognizes a hand with an exposed meld", () =>
  assert.equal(
    isWinningHand(
      ["1m", "2m", "3m", "4p", "5p", "6p", "E", "E", "E", "R", "R"],
      1,
    ),
    true,
  ));
test("rejects a near-complete non-winning hand", () =>
  assert.equal(isWinningHand([...complete.slice(0, 13), "G"]), false));
test("ron requires the discard to make a legal hand", () => {
  assert.equal(canRon(complete.slice(0, 13), "R"), true);
  assert.equal(canRon(complete.slice(0, 13), "G"), false);
});
test("pon needs two matching concealed tiles", () => {
  assert.equal(canPon(["4m", "4m", "5m"], "4m"), true);
  assert.equal(canPon(["4m", "5m", "6m"], "4m"), false);
});
test("chi exposes only legal same-suit sequences", () => {
  assert.deepEqual(chiOptions(["2m", "3m", "5m", "6m"], "4m"), [
    ["2m", "3m"],
    ["3m", "5m"],
    ["5m", "6m"],
  ]);
  assert.deepEqual(chiOptions(["2m", "3m"], "E"), []);
});
test("chi is limited to the immediately next player", () => {
  const hand = ["2m", "3m"];
  assert.equal(legalClaims(hand, "4m", true).chi.length, 1);
  assert.equal(legalClaims(hand, "4m", false).chi.length, 0);
});
test("removing a claimed duplicate removes exactly two tiles", () =>
  assert.deepEqual(removeTiles(["4m", "4m", "4m", "5m"], ["4m", "4m"]), [
    "4m",
    "5m",
  ]));

function pending({
  discarder = 1,
  discard = "4m",
  hands = [[], [], [], []],
  phase = "claim",
  turn = 1,
} = {}) {
  return {
    wall: ["1m"],
    phase,
    turn,
    lastDiscard: discard,
    lastDiscarder: discarder,
    turnStartedByDraw: phase === "discard",
    result: null,
    players: hands.map((hand, i) => ({
      hand,
      melds: [],
      discards: i === discarder ? [discard] : [],
    })),
  };
}

test("self-draw is available only to the active player with a complete drawn hand", () => {
  const state = pending({
    phase: "discard",
    turn: 0,
    hands: [complete, [], [], []],
  });
  assert.equal(canSelfDraw(state), true);
  assert.equal(canSelfDraw({ ...state, turn: 1 }), false);
});
test("the discarder has no legal claims on their own tile", () => {
  const state = pending({
    discarder: 0,
    hands: [["4m", "4m", "4m"], [], [], []],
  });
  assert.deepEqual(claimChoices(state, 0), { ron: false, pon: false, chi: [] });
  assert.equal(settleClaims(state).kind, "advance");
});
test("a computer Ron takes priority over the user's requested Pon", () => {
  const ronHand = complete.slice(0, 13);
  const state = pending({
    discarder: 1,
    discard: "R",
    hands: [["R", "R", "1m"], [], ronHand, []],
  });
  assert.deepEqual(settleClaims(state, { type: "pon" }), {
    kind: "claim",
    seat: 2,
    type: "ron",
    tiles: null,
  });
});
test("a computer Ron takes priority over the user's requested Chi", () => {
  const ronHand = complete
    .slice(0, 13)
    .map((tile) => (tile === "R" ? "4m" : tile));
  const state = pending({
    discarder: 3,
    discard: "4m",
    hands: [["2m", "3m"], ronHand, [], []],
  });
  const outcome = settleClaims(state, { type: "chi", option: 0 });
  assert.equal(outcome.type, "ron");
  assert.equal(outcome.seat, 1);
});
test("equal-priority claims are settled by clockwise distance from the discarder", () => {
  const eastRon = [
    "2m",
    "3m",
    "1p",
    "2p",
    "3p",
    "4p",
    "5p",
    "6p",
    "7s",
    "8s",
    "9s",
    "E",
    "E",
  ];
  const westRon = [
    "5m",
    "6m",
    "1s",
    "2s",
    "3s",
    "4s",
    "5s",
    "6s",
    "7p",
    "8p",
    "9p",
    "S",
    "S",
  ];
  const state = pending({ discarder: 1, hands: [eastRon, [], westRon, []] });
  const result = settleClaims(state, { type: "ron" });
  assert.equal(result.seat, 2);
  assert.equal(result.type, "ron");
});
test("pending claims and computer discard phases remain resumable after serialization", () => {
  const claimState = pending({
    discarder: 1,
    hands: [["4m", "4m"], [], [], []],
  });
  const restored = JSON.parse(JSON.stringify(claimState));
  assert.equal(claimChoices(restored, 0).pon, true);
  assert.equal(settleClaims(restored, { type: "pon" }).seat, 0);
  const computerDiscard = pending({
    phase: "discard",
    turn: 2,
    discard: null,
    discarder: null,
    hands: [[], [], ["1m"], []],
  });
  assert.equal(
    discardTransition(JSON.parse(JSON.stringify(computerDiscard)), 2, "1m")
      .phase,
    "claim",
  );
});
test("a restored computer discard with no user claim can settle immediately", () => {
  const state = pending({ discarder: 1, hands: [[], [], [], []] });
  assert.deepEqual(settleClaims(JSON.parse(JSON.stringify(state))), {
    kind: "advance",
    seat: 2,
  });
});
test("draw and settlement transitions return new state without mutating their inputs", () => {
  const state = {
    ...pending({
      phase: "draw",
      turn: 1,
      discard: null,
      discarder: null,
      hands: [[], [], [], []],
    }),
    wall: ["9s"],
  };
  const drawn = drawTransition(state);
  assert.equal(state.wall.length, 1);
  assert.equal(drawn.players[1].hand[0], "9s");
  const claim = pending({ discarder: 1, hands: [["4m", "4m"], [], [], []] });
  const settled = applySettlement(claim, settleClaims(claim, { type: "pon" }));
  assert.equal(claim.players[1].discards.length, 1);
  assert.equal(settled.players[1].discards.length, 0);
});

test("self-draw requires an opening hand or a wall draw, never a Pon or Chi claim", () => {
  const claimed = pending({
    phase: "discard",
    turn: 0,
    hands: [complete, [], [], []],
  });
  claimed.turnStartedByDraw = false;
  assert.equal(canSelfDraw(claimed), false);
  const restored = JSON.parse(
    JSON.stringify({ ...claimed, turnStartedByDraw: true }),
  );
  assert.equal(canSelfDraw(restored), true);
  const wallDraw = drawTransition({
    ...pending({
      phase: "draw",
      turn: 0,
      discard: null,
      discarder: null,
      hands: [complete.slice(0, 13), [], [], []],
    }),
    wall: ["R"],
  });
  assert.equal(wallDraw.turnStartedByDraw, true);
  assert.equal(canSelfDraw(wallDraw), true);
});
test("seat order is East, South, West, North", () =>
  assert.deepEqual(seatNames, ["East", "South", "West", "North"]));
test("unknown tile codes and fifth copies are rejected without transition", () => {
  assert.equal(isTileCode("10m"), false);
  assert.equal(isTileCode("0p"), false);
  assert.equal(isTileCode("Purple"), false);
  assert.equal(
    isWinningHand([...complete.slice(0, 10), "E", "E", "E", "E", "E"]),
    false,
  );
  const unknown = pending({
    phase: "discard",
    turn: 0,
    discard: null,
    discarder: null,
    hands: [["1m"], [], [], []],
  });
  unknown.wall = ["Purple"];
  const fifth = pending({
    phase: "discard",
    turn: 0,
    discard: null,
    discarder: null,
    hands: [["1m", "1m", "1m", "1m", "1m"], [], [], []],
  });
  assert.equal(isValidRound(unknown), false);
  assert.equal(discardTransition(unknown, 0, "1m"), null);
  assert.equal(isValidRound(fifth), false);
  assert.equal(discardTransition(fifth, 0, "1m"), null);
});
test("impossible exposed melds and invalid Chi choices do not change the round", () => {
  const malformed = pending();
  malformed.players[0].melds = Array.from({ length: 5 }, () => [
    "1m",
    "2m",
    "3m",
  ]);
  assert.equal(isValidRound(malformed), false);
  assert.equal(settleClaims(malformed), null);
  const badMeld = pending();
  badMeld.players[0].melds = [["1m", "2p", "3m"]];
  assert.equal(isValidRound(badMeld), false);
  const chi = pending({
    discarder: 3,
    discard: "4m",
    hands: [["2m", "3m"], [], [], []],
  });
  const snapshot = JSON.stringify(chi);
  assert.equal(settleClaims(chi, { type: "chi", option: 9 }), null);
  assert.equal(JSON.stringify(chi), snapshot);
});
test("round validation rejects null players and claim windows without their active discard", () => {
  const nullPlayer = pending();
  nullPlayer.players[2] = null;
  assert.equal(isValidRound(nullPlayer), false);
  const noDiscarder = pending({ discarder: null, discard: "4m" });
  assert.equal(isValidRound(noDiscarder), false);
  const missingDiscard = pending();
  missingDiscard.players[1].discards = [];
  assert.equal(isValidRound(missingDiscard), false);
});
test("discard history retains a claimed discard while the active discard is removed", () => {
  const state = pending({
    phase: "discard",
    turn: 0,
    discard: null,
    discarder: null,
    hands: [["4m"], [], [], []],
  });
  const discarded = discardTransition(state, 0, "4m");
  assert.deepEqual(discarded.players[0].discardHistory, ["4m"]);
  const settled = applySettlement(discarded, settleClaims(discarded));
  assert.deepEqual(settled.players[0].discardHistory, ["4m"]);
});

test("a deterministic full hand conserves all 136 tiles, exercises claims, and terminates", () => {
  let seed = 1;
  const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const wall = createWall(random),
    players = Array.from({ length: 4 }, () => ({
      hand: [],
      melds: [],
      discards: [],
      discardHistory: [],
    }));
  for (let round = 0; round < 13; round++)
    for (const player of players) player.hand.push(wall.pop());
  players[0].hand.push(wall.pop());
  let state = {
      wall,
      players,
      turn: 0,
      phase: "discard",
      lastDiscard: null,
      lastDiscarder: null,
      turnStartedByDraw: true,
      result: null,
      resultKind: null,
      winnerSeat: null,
    },
    claims = 0,
    steps = 0;
  const inventory = (round) => [
    ...round.wall,
    ...round.players.flatMap((player) => [
      ...player.hand,
      ...player.discards,
      ...player.melds.flat(),
    ]),
  ];
  const baseline = [...inventory(state)].sort();
  while (state.phase !== "ended" && steps++ < 1000) {
    assert.deepEqual(inventory(state).sort(), baseline);
    if (state.phase === "draw") {
      state = drawTransition(state);
      continue;
    }
    if (state.phase === "discard") {
      state = discardTransition(
        state,
        state.turn,
        chooseDiscard(state.players[state.turn].hand),
      );
      continue;
    }
    const outcome = settleClaims(state);
    if (outcome.kind === "claim") claims++;
    state = applySettlement(state, outcome);
  }
  assert.ok(steps < 1000);
  assert.equal(state.phase, "ended");
  assert.deepEqual(inventory(state).sort(), baseline);
  assert.ok(claims > 0);
  assert.equal(
    isValidSavedRound({
      ...state,
      handId: "hand-simulated-1",
      turnCount: steps,
      message: state.result,
      finishedAt: "2026-01-01T00:00:00.000Z",
    }),
    true,
  );
});
