import test from "node:test";
import assert from "node:assert/strict";
import { deriveHistoryStatistics } from "./statistics.js";
import { filterCompletedHistory } from "./persistence.js";

function hand(handId, winner, finishedAt, playedMs) {
  return {
    handId,
    result: winner === null ? "Draw" : "A seat wins",
    winner,
    finishedAt,
    playedMs,
  };
}

test("derives East wins, losses, draws, and Played time from completed history", () => {
  const statistics = deriveHistoryStatistics([
    hand("east-win", 0, 400, 4_000),
    hand("south-win", 1, 300, 3_000),
    hand("draw", null, 200, 2_000),
    hand("west-win", 2, 100, 1_000),
  ]);

  assert.deepEqual(statistics, {
    completedHands: 4,
    eastWins: 1,
    losses: 2,
    draws: 1,
    totalPlayedMs: 10_000,
    averagePlayedMs: 2_500,
    winRate: 0.25,
  });
});

test("uses History's immutable first duplicate record without mutating input", async () => {
  const { restoreHistory } = await import("./persistence.js");
  const firstDraw = hand("same-hand", null, 100, 1_000);
  const laterEastWin = hand("same-hand", 0, 200, 9_000);
  const history = [firstDraw, laterEastWin];
  const original = structuredClone(history);

  const restored = restoreHistory({ version: 1, hands: history });
  const statistics = deriveHistoryStatistics(history);

  assert.deepEqual(restored, [firstDraw]);
  assert.deepEqual(statistics, {
    completedHands: 1,
    eastWins: 0,
    losses: 0,
    draws: 1,
    totalPlayedMs: 1_000,
    averagePlayedMs: 1_000,
    winRate: 0,
  });
  assert.deepEqual(history, original);
});

test("uses only the newest 50 unique completed results", () => {
  const history = Array.from({ length: 51 }, (_, index) =>
    hand(`hand-${index}`, index === 0 ? 0 : null, index, 1_000),
  );
  const statistics = deriveHistoryStatistics(history);

  assert.equal(statistics.completedHands, 50);
  assert.equal(statistics.eastWins, 0);
  assert.equal(statistics.draws, 50);
  assert.equal(statistics.totalPlayedMs, 50_000);
  assert.equal(statistics.averagePlayedMs, 1_000);
  assert.equal(statistics.winRate, 0);
});

test("returns a useful zero-value result for empty or unfinished data", () => {
  const statistics = deriveHistoryStatistics([
    { handId: "unfinished", winner: 0, finishedAt: 100, playedMs: 1_000 },
    { handId: "abandoned", result: "East wins", winner: 0, playedMs: 1_000 },
    { handId: "invalid-duration", result: "Draw", winner: null, finishedAt: 100, playedMs: -1 },
  ]);

  assert.deepEqual(statistics, {
    completedHands: 0,
    eastWins: 0,
    losses: 0,
    draws: 0,
    totalPlayedMs: 0,
    averagePlayedMs: 0,
    winRate: 0,
  });
});

test("keeps statistics based on the full retained history when a result filter narrows the list", () => {
  const history = [
    hand("east", 0, 3, 3_000),
    hand("loss", 1, 2, 2_000),
    hand("draw", null, 1, 1_000),
  ];
  const filtered = filterCompletedHistory(history, "east-wins");

  assert.equal(filtered.hands.length, 1);
  assert.deepEqual(deriveHistoryStatistics(history), {
    completedHands: 3,
    eastWins: 1,
    losses: 1,
    draws: 1,
    totalPlayedMs: 6_000,
    averagePlayedMs: 2_000,
    winRate: 1 / 3,
  });
});
