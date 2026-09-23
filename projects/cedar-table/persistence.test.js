import test from "node:test";
import assert from "node:assert/strict";
import {
  claim,
  computerTurn,
  discard,
  newGame,
  pass,
  resolveClaims,
  selectedClaim,
  tsumo,
} from "./game.js";
import {
  addCompletedHand,
  addCompletedHandToStorage,
  filterCompletedHistory,
  HISTORY_KEY,
  loadFromStorage,
  loadHistoryFromStorage,
  restoreHistory,
  restoreSave,
  saveHistoryToStorage,
  saveToStorage,
} from "./persistence.js";
import { tileKey } from "./rules.js";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function takeTile(state, want) {
  const places = [state.wall, ...state.hands];
  for (const place of places) {
    const index = place.findIndex((tile) => tileKey(tile) === tileKey(want));
    if (index >= 0) return place.splice(index, 1)[0];
  }
}
function saveRecord(state, { activeMs = 4200, paused = false } = {}) {
  return JSON.stringify({
    version: 1,
    savedAt: 1000,
    activeMs,
    paused,
    state: { ...state, passedPlayers: [...state.passedPlayers] },
  });
}
function unresolvedRonState() {
  const state = newGame(() => 0.5);
  const take = (want) => takeTile(state, want);
  const east = [
    ["bamboo", 1], ["bamboo", 2],
    ["characters", 1], ["characters", 2], ["characters", 3],
    ["dots", 1], ["dots", 2], ["dots", 3],
    ["honor", "east"], ["honor", "east"], ["honor", "east"],
    ["honor", "white"], ["honor", "white"],
  ];
  state.wall.push(...state.hands[0]);
  state.hands[0] = east.map(([suit, rank]) =>
    take(suit === "honor" ? { suit, honor: rank } : { suit, rank }),
  );
  const tile = take({ suit: "bamboo", rank: 3 });
  state.discards[3].push(tile);
  state.lastDiscard = { player: 3, tile };
  state.turn = 3;
  state.phase = "claim";
  state.tsumoEligible = false;
  state.awaitingHuman = false;
  return state;
}
function claimState() {
  const state = newGame(() => 0.5);
  const take = (want) => takeTile(state, want);
  const tile = take({ suit: "dots", rank: 4 });
  const a = take({ suit: "dots", rank: 4 });
  const b = take({ suit: "dots", rank: 4 });
  state.hands[0].push(a, b);
  state.discards[1].push(tile);
  state.lastDiscard = { player: 1, tile };
  state.turn = 1;
  state.phase = "claim";
  state.tsumoEligible = false;
  state.awaitingHuman = false;
  return state;
}

test("restores an unresolved legal Ron before the claim resolver runs", () => {
  const original = unresolvedRonState();
  const discardId = original.lastDiscard.tile.id;
  assert.deepEqual(selectedClaim(original), { player: 0, types: ["ron"] });
  const restored = restoreSave(saveRecord(original));
  assert.ok(restored);
  assert.equal(restored.state.awaitingHuman, false);
  assert.equal(restored.state.lastDiscard.tile.id, discardId);
  resolveClaims(restored.state);
  assert.equal(restored.state.awaitingHuman, true);
  claim(restored.state, 0, "ron");
  assert.equal(restored.state.phase, "ended");
  assert.equal(restored.state.winner, 0);
});
test("restores a pending human claim with the same physical discard", () => {
  const original = claimState();
  resolveClaims(original);
  assert.equal(original.awaitingHuman, true);
  const originalDiscardId = original.lastDiscard.tile.id;
  const restored = restoreSave(saveRecord(original));
  assert.ok(restored);
  assert.equal(restored.state.phase, "claim");
  assert.equal(restored.state.awaitingHuman, true);
  assert.equal(restored.state.lastDiscard.tile.id, originalDiscardId);
  claim(restored.state, 0, "pon");
  assert.equal(restored.state.melds[0][0].tiles.some((tile) => tile.id === originalDiscardId), true);
});
test("restores a finished hand produced by a real tsumo", () => {
  const state = newGame(() => 0.5);
  state.wall.push(...state.hands[0]);
  state.hands[0] = [
    ["bamboo", 1], ["bamboo", 2], ["bamboo", 3],
    ["characters", 2], ["characters", 3], ["characters", 4],
    ["dots", 7], ["dots", 8], ["dots", 9],
    ["east"], ["east"], ["east"], ["red"], ["red"],
  ].map(([suit, rank]) => takeTile(state, rank ? { suit, rank } : { suit: "honor", honor: suit }));
  tsumo(state);
  assert.equal(state.phase, "ended");
  const restored = restoreSave(saveRecord(state, { activeMs: 9000, paused: true }));
  assert.ok(restored);
  assert.equal(restored.state.phase, "ended");
  assert.equal(restored.state.winner, 0);
  assert.equal(restored.state.message, "East (You) wins by Tsumo!");
  assert.equal(restored.paused, true);
});
test("round-trips saves after every transition in complete hands", () => {
  for (let seed = 1; seed <= 4; seed += 1) {
    let value = seed;
    const random = () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 2 ** 32;
    };
    let state = newGame(random);
    let steps = 0;
    while (state.phase !== "ended" && steps < 1000) {
      if (state.awaitingHuman) pass(state);
      else if (state.phase === "claim") resolveClaims(state);
      else if (state.turn === 0) discard(state, 0, 0);
      else computerTurn(state);

      const restored = restoreSave(saveRecord(state));
      assert.ok(restored, `seed ${seed}, transition ${steps}`);
      state = restored.state;
      steps += 1;
    }
    assert.ok(steps < 1000);
    assert.equal(state.phase, "ended");
  }
});
test("rejects invalid tile and claim state", () => {
  const corruptedTile = newGame(() => 0.5);
  corruptedTile.wall[0].rank = 99;
  assert.equal(restoreSave(saveRecord(corruptedTile, { activeMs: 0 })), null);

  const ordinaryDiscard = newGame(() => 0.5);
  ordinaryDiscard.awaitingHuman = true;
  assert.equal(restoreSave(saveRecord(ordinaryDiscard, { activeMs: 0 })), null);
});
test("rejects damaged saves and reports unavailable storage without breaking play", () => {
  const local = storage();
  local.setItem("cedar-table.hand.v1", "{broken");
  assert.deepEqual(loadFromStorage(local), { kind: "damaged" });
  const blocked = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(loadFromStorage(blocked), { kind: "unavailable" });
  assert.deepEqual(saveToStorage(blocked, newGame(), 0), { ok: false });
});

test("orders completed hands by finish time and keeps a repeated hand immutable", () => {
  const old = { handId: "old", result: "Draw", winner: null, finishedAt: 100, playedMs: 4_200 };
  const newer = { handId: "new", result: "West wins by Ron", winner: 2, finishedAt: 200, playedMs: 5_000 };
  const changedOld = { ...old, result: "East (You) wins by Tsumo", winner: 0, playedMs: 9_000 };
  const history = addCompletedHand(addCompletedHand(addCompletedHand([], old), newer), changedOld);
  assert.deepEqual(history, [newer, old]);
});
test("sorts stored history before applying the newest 50 limit", () => {
  const hands = Array.from({ length: 51 }, (_, index) => ({
    handId: `hand-${index}`,
    result: "Draw",
    winner: null,
    finishedAt: index,
    playedMs: index * 1000,
  })).reverse();
  const restored = restoreHistory({ version: 1, hands: [hands.at(-1), ...hands.slice(0, -1)] });
  assert.equal(restored.length, 50);
  assert.equal(restored[0].handId, "hand-50");
  assert.equal(restored.at(-1).handId, "hand-1");
});
test("merges the latest stored history before adding a completed hand", () => {
  const local = storage();
  const newer = { handId: "new", result: "South wins by Tsumo", winner: 1, finishedAt: 200, playedMs: 5_000 };
  const olderTabResult = { handId: "old", result: "Draw", winner: null, finishedAt: 100, playedMs: 4_200 };
  saveHistoryToStorage(local, [newer]);
  const saved = addCompletedHandToStorage(local, olderTabResult);
  assert.equal(saved.ok, true);
  assert.deepEqual(loadHistoryFromStorage(local).hands, [newer, olderTabResult]);
});
test("restores legacy current saves without history fields", () => {
  const state = newGame(() => 0.5);
  const restored = restoreSave(saveRecord(state));
  assert.ok(restored);
  assert.equal(restored.handId, null);
  assert.equal(restored.completedAt, null);
  assert.equal(restored.completedAtEstimated, false);
});
test("damaged or blocked history does not affect the resumable hand", () => {
  const local = storage();
  saveToStorage(local, newGame(() => 0.5), 4_200, 1000);
  local.setItem(HISTORY_KEY, "{broken");
  assert.deepEqual(loadHistoryFromStorage(local), { kind: "damaged", hands: [] });
  assert.equal(loadFromStorage(local).kind, "saved");

  const blockedHistory = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.deepEqual(loadHistoryFromStorage(blockedHistory), { kind: "unavailable", hands: [] });
  assert.deepEqual(saveHistoryToStorage(blockedHistory, []), { ok: false });
});

test("filters normalized retained history by every result type without mutating it", () => {
  const invalid = { handId: "invalid", result: "Draw", winner: null, finishedAt: 999, playedMs: -1 };
  const firstDuplicateDraw = { handId: "duplicate", result: "Draw", winner: null, finishedAt: 10, playedMs: 100 };
  const laterDuplicateEastWin = { handId: "duplicate", result: "East wins", winner: 0, finishedAt: 1000, playedMs: 900 };
  const mixedHands = Array.from({ length: 52 }, (_, index) => ({
    handId: `hand-${index}`,
    result: index % 3 === 0 ? "East wins" : index % 3 === 1 ? "South wins" : "Draw",
    winner: index % 3 === 0 ? 0 : index % 3 === 1 ? 1 : null,
    finishedAt: index + 20,
    playedMs: index * 100,
  }));
  const history = [invalid, firstDuplicateDraw, laterDuplicateEastWin, ...mixedHands];
  const original = structuredClone(history);

  const all = filterCompletedHistory(history, "all");
  const eastWins = filterCompletedHistory(history, "east-wins");
  const losses = filterCompletedHistory(history, "losses");
  const draws = filterCompletedHistory(history, "draws");
  const unknown = filterCompletedHistory(history, "not-a-filter");

  assert.equal(all.total, 50);
  assert.equal(all.hands[0].handId, "hand-51");
  assert.equal(all.hands.at(-1).handId, "hand-2");
  assert.deepEqual(eastWins.hands.map((hand) => hand.handId), ["hand-51", "hand-48", "hand-45", "hand-42", "hand-39", "hand-36", "hand-33", "hand-30", "hand-27", "hand-24", "hand-21", "hand-18", "hand-15", "hand-12", "hand-9", "hand-6", "hand-3"]);
  assert.ok(losses.hands.every((hand) => hand.winner !== null && hand.winner !== 0));
  assert.ok(draws.hands.every((hand) => hand.winner === null));
  assert.equal(eastWins.total, all.total);
  assert.deepEqual(unknown, all);
  assert.deepEqual(history, original);
});

test("distinguishes no saved history from a filter with no matching results", () => {
  assert.deepEqual(filterCompletedHistory([], "draws"), { filter: "draws", hands: [], total: 0 });
  const noDraws = filterCompletedHistory([
    { handId: "east", result: "East wins", winner: 0, finishedAt: 2, playedMs: 100 },
    { handId: "loss", result: "South wins", winner: 1, finishedAt: 1, playedMs: 100 },
  ], "draws");
  assert.deepEqual(noDraws, { filter: "draws", hands: [], total: 2 });
});

test("filters exact result IDs for every winner and retains the first valid duplicate", () => {
  const invalidDuplicate = { handId: "retained-duplicate", result: "", winner: 0, finishedAt: 90, playedMs: 100 };
  const firstValidDuplicateLoss = { handId: "retained-duplicate", result: "West wins", winner: 2, finishedAt: 60, playedMs: 600 };
  const laterDuplicateEastWin = { handId: "retained-duplicate", result: "East wins", winner: 0, finishedAt: 100, playedMs: 1_000 };
  const history = [
    invalidDuplicate,
    firstValidDuplicateLoss,
    laterDuplicateEastWin,
    { handId: "east-win", result: "East wins", winner: 0, finishedAt: 50, playedMs: 500 },
    { handId: "south-loss", result: "South wins", winner: 1, finishedAt: 40, playedMs: 400 },
    { handId: "north-loss", result: "North wins", winner: 3, finishedAt: 30, playedMs: 300 },
    { handId: "draw", result: "Draw", winner: null, finishedAt: 20, playedMs: 200 },
  ];

  assert.deepEqual(filterCompletedHistory(history, "all").hands.map((hand) => hand.handId), ["retained-duplicate", "east-win", "south-loss", "north-loss", "draw"]);
  assert.deepEqual(filterCompletedHistory(history, "east-wins").hands.map((hand) => hand.handId), ["east-win"]);
  assert.deepEqual(filterCompletedHistory(history, "losses").hands.map((hand) => hand.handId), ["retained-duplicate", "south-loss", "north-loss"]);
  assert.deepEqual(filterCompletedHistory(history, "draws").hands.map((hand) => hand.handId), ["draw"]);
});

test("does not restore an older-than-50 matching result after retention", () => {
  const retainedLosses = Array.from({ length: 50 }, (_, index) => ({
    handId: `retained-loss-${index}`,
    result: "South wins",
    winner: 1,
    finishedAt: index + 1,
    playedMs: 100,
  }));
  const onlyOlderDraw = { handId: "older-draw", result: "Draw", winner: null, finishedAt: 0, playedMs: 100 };

  assert.deepEqual(filterCompletedHistory([...retainedLosses, onlyOlderDraw], "draws"), {
    filter: "draws",
    hands: [],
    total: 50,
  });
});
