import test from "node:test";
import assert from "node:assert/strict";
import { createWall } from "./game.js";
import {
  BACKUP_VERSION,
  createBackup,
  defaultPreferences,
  isValidSavedRound,
  recordFinishedHand,
  validateBackup,
  writeJson,
  readJson,
} from "./persistence.js";

const winningHand = [
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
const entry = {
  id: "hand-1",
  outcome: "win",
  winnerSeat: 0,
  winner: "You · East",
  finishedAt: "2026-01-01T00:00:00.000Z",
  turnCount: 4,
  note: "",
};

function takeTiles(source, tiles) {
  return tiles.map((tile) => source.splice(source.indexOf(tile), 1)[0]);
}

function dealtRound() {
  const wall = createWall(() => 0);
  const players = Array.from({ length: 4 }, () => ({
    hand: [],
    melds: [],
    discards: [],
    discardHistory: [],
  }));
  for (let round = 0; round < 13; round++)
    for (const player of players) player.hand.push(wall.pop());
  players[0].hand.push(wall.pop());
  return {
    handId: "hand-test-1",
    turnCount: 0,
    wall,
    phase: "discard",
    turn: 0,
    lastDiscard: null,
    lastDiscarder: null,
    turnStartedByDraw: true,
    message: "Opening turn",
    result: null,
    resultKind: null,
    winnerSeat: null,
    players,
  };
}

function wonRound() {
  const round = dealtRound();
  const inventory = [
    ...round.wall,
    ...round.players.flatMap((player) => player.hand),
  ];
  round.players[0].hand = takeTiles(inventory, winningHand);
  for (let seat = 1; seat < 4; seat++)
    round.players[seat].hand = inventory.splice(0, 13);
  round.wall = inventory;
  return {
    ...round,
    phase: "ended",
    result: "You win by self-draw.",
    resultKind: "win",
    winnerSeat: 0,
    finishedAt: "2026-01-01T00:00:00.000Z",
  };
}

function exhaustedDrawRound() {
  const round = dealtRound();
  const openingDiscard = round.players[0].hand.pop();
  const discards = [openingDiscard, ...round.wall];
  round.players[0].discards = discards;
  round.players[0].discardHistory = discards;
  return {
    ...round,
    wall: [],
    phase: "ended",
    result: "The wall is exhausted. This hand is a draw.",
    resultKind: "draw",
    winnerSeat: null,
    finishedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("finished hands are unique and history retains the newest 30", () => {
  let history = [];
  history = recordFinishedHand(history, entry);
  history = recordFinishedHand(history, entry);
  assert.equal(history.length, 1);
  for (let i = 2; i <= 31; i++)
    history = recordFinishedHand(history, { ...entry, id: `hand-${i}` });
  assert.equal(history.length, 30);
  assert.equal(history[0].id, "hand-31");
  assert.equal(history.at(-1).id, "hand-2");
});

test("backup validation accepts a canonical dealt round and rejects damaged metadata", () => {
  const round = dealtRound(),
    backup = createBackup(round, defaultPreferences(), [entry]);
  assert.equal(isValidSavedRound(round), true);
  assert.deepEqual(validateBackup(backup), backup);
  assert.equal(
    validateBackup({ ...backup, version: BACKUP_VERSION + 1 }),
    null,
  );
  assert.equal(
    validateBackup({ ...backup, round: { ...round, handId: "wrong" } }),
    null,
  );
  assert.equal(
    validateBackup({
      ...backup,
      round: {
        ...round,
        players: round.players.map((player, index) =>
          index ? player : { ...player, hand: player.hand.slice(1) },
        ),
      },
    }),
    null,
  );
  assert.equal(
    validateBackup({
      ...backup,
      round: {
        ...round,
        players: round.players.map((player, index) =>
          index ? player : { ...player, discardHistory: ["Purple"] },
        ),
      },
    }),
    null,
  );
  assert.equal(
    validateBackup({ ...backup, history: [{ ...entry, outcome: "victory" }] }),
    null,
  );
  assert.equal(
    validateBackup({ ...backup, history: [entry, { ...entry }] }),
    null,
  );
});

test("saved rounds require explicit, possible completion outcomes", () => {
  const round = dealtRound();
  assert.equal(
    isValidSavedRound({ ...round, resultKind: "win", winnerSeat: 0 }),
    false,
  );

  const won = wonRound();
  assert.equal(isValidSavedRound(won), true);
  assert.equal(isValidSavedRound({ ...won, winnerSeat: null }), false);
  assert.equal(
    isValidSavedRound({
      ...won,
      players: won.players.map((player, seat) =>
        seat ? player : { ...player, hand: [...player.hand.slice(0, 13), "G"] },
      ),
    }),
    false,
  );

  const drawn = exhaustedDrawRound();
  assert.equal(isValidSavedRound(drawn), true);
  assert.equal(
    isValidSavedRound({
      ...drawn,
      wall: [drawn.players[0].discards[0]],
      players: drawn.players.map((player, seat) =>
        seat
          ? player
          : {
              ...player,
              discards: player.discards.slice(1),
              discardHistory: player.discardHistory.slice(1),
            },
      ),
    }),
    false,
  );
});

test("storage helpers report unavailable storage without throwing", () => {
  const broken = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(writeJson(broken, "x", {}), false);
  assert.ok(readJson(broken, "x").error);
});
