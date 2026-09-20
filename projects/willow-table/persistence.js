import { createWall, isTileCode, isWinningHand } from "./game.js";
import { isValidRound } from "./transitions.js";

export const BACKUP_VERSION = 2;
export const MAX_HISTORY = 30;
const validSpeeds = ["slow", "normal", "fast"],
  validTileText = ["standard", "large"],
  validMotion = ["system", "reduce", "full"];
const tileCounts = (tiles) =>
  tiles.reduce(
    (counts, tile) => (counts.set(tile, (counts.get(tile) || 0) + 1), counts),
    new Map(),
  );
const sameTiles = (left, right) => {
  const a = tileCounts(left),
    b = tileCounts(right);
  return (
    a.size === b.size && [...a].every(([tile, count]) => b.get(tile) === count)
  );
};
const validText = (value) => typeof value === "string" && value.length <= 2000;
const validId = (value) =>
  typeof value === "string" &&
  /^hand-[a-zA-Z0-9-]+$/.test(value) &&
  value.length <= 100;

export const defaultPreferences = () => ({
  speed: "normal",
  tileText: "standard",
  motion: "system",
});
export function isValidPreferences(value) {
  return (
    !!value &&
    typeof value === "object" &&
    validSpeeds.includes(value.speed) &&
    validTileText.includes(value.tileText) &&
    validMotion.includes(value.motion)
  );
}
export function isValidHistory(value) {
  return (
    Array.isArray(value) &&
    value.length <= MAX_HISTORY &&
    new Set(value.map((entry) => entry?.id)).size === value.length &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        validId(entry.id) &&
        ["win", "draw"].includes(entry.outcome) &&
        (entry.outcome === "draw"
          ? entry.winnerSeat === null && entry.winner === "—"
          : Number.isInteger(entry.winnerSeat) &&
            entry.winnerSeat >= 0 &&
            entry.winnerSeat < 4 &&
            entry.winner ===
              ["You · East", "South", "West", "North"][entry.winnerSeat]) &&
        typeof entry.finishedAt === "string" &&
        !Number.isNaN(Date.parse(entry.finishedAt)) &&
        Number.isInteger(entry.turnCount) &&
        entry.turnCount >= 0 &&
        typeof entry.note === "string" &&
        entry.note.length <= 280,
    )
  );
}
export function normalizeHistory(value) {
  return isValidHistory(value) ? value.slice(0, MAX_HISTORY) : [];
}
export function recordFinishedHand(history, entry) {
  if (
    !isValidHistory(history) ||
    !isValidHistory([{ ...entry, note: entry.note ?? "" }]) ||
    history.some((item) => item.id === entry.id)
  )
    return history;
  return [{ ...entry, note: entry.note ?? "" }, ...history].slice(
    0,
    MAX_HISTORY,
  );
}
export function isValidSavedRound(round) {
  if (
    !isValidRound(round) ||
    !validId(round.handId) ||
    !Number.isInteger(round.turnCount) ||
    round.turnCount < 0 ||
    !validText(round.message) ||
    !(round.result === null || validText(round.result)) ||
    ![null, "win", "draw"].includes(round.resultKind) ||
    !(
      round.winnerSeat === null ||
      (Number.isInteger(round.winnerSeat) &&
        round.winnerSeat >= 0 &&
        round.winnerSeat < 4)
    )
  )
    return false;
  if (
    (round.phase === "ended") !== (round.resultKind !== null) ||
    (round.resultKind === "win") !== (round.winnerSeat !== null) ||
    (round.resultKind === "draw" && round.winnerSeat !== null) ||
    (round.phase === "ended") !==
      (typeof round.finishedAt === "string" &&
        !Number.isNaN(Date.parse(round.finishedAt)))
  )
    return false;
  if (
    round.phase !== "ended" &&
    (round.result !== null ||
      (round.finishedAt !== undefined && round.finishedAt !== null))
  )
    return false;
  if (
    !round.players.every(
      (player) =>
        Array.isArray(player.discardHistory) &&
        player.discardHistory.every(isTileCode) &&
        player.discards.every((tile) => player.discardHistory.includes(tile)),
    )
  )
    return false;
  const inventory = [
    ...round.wall,
    ...round.players.flatMap((player) => [
      ...player.hand,
      ...player.discards,
      ...player.melds.flat(),
    ]),
  ];
  if (
    inventory.length !== 136 ||
    !sameTiles(
      inventory,
      createWall(() => 0),
    )
  )
    return false;
  const expected = (player) => 13 - player.melds.length * 3,
    counts = round.players.map((player) => player.hand.length),
    active = round.turn;
  if (
    round.phase === "draw" &&
    !counts.every((count, seat) => count === expected(round.players[seat]))
  )
    return false;
  if (
    round.phase === "claim" &&
    !counts.every((count, seat) => count === expected(round.players[seat]))
  )
    return false;
  if (
    round.phase === "discard" &&
    !counts.every(
      (count, seat) =>
        count === expected(round.players[seat]) + (seat === active ? 1 : 0),
    )
  )
    return false;
  if (round.phase === "ended") {
    const winner = round.resultKind === "win" ? round.winnerSeat : null;
    if (
      !counts.every(
        (count, seat) =>
          count === expected(round.players[seat]) + (seat === winner ? 1 : 0),
      )
    )
      return false;
    if (
      round.resultKind === "win" &&
      !isWinningHand(
        round.players[winner].hand,
        round.players[winner].melds.length,
      )
    )
      return false;
    if (round.resultKind === "draw" && round.wall.length !== 0) return false;
  }
  return true;
}
export function createBackup(round, preferences, history) {
  return { version: BACKUP_VERSION, round, preferences, history };
}
export function validateBackup(value) {
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== BACKUP_VERSION ||
    !isValidSavedRound(value.round) ||
    !isValidPreferences(value.preferences) ||
    !isValidHistory(value.history)
  )
    return null;
  return structuredClone(value);
}
export function readJson(storage, key) {
  try {
    const raw = storage?.getItem(key);
    return raw === null ? { value: null } : { value: JSON.parse(raw) };
  } catch (error) {
    return { value: null, error };
  }
}
export function writeJson(storage, key, value) {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return !!storage;
  } catch {
    return false;
  }
}
