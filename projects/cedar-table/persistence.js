import { selectedClaim } from "./game.js?v=13";
import { createWall, SUITS, tileKey } from "./rules.js?v=13";

export const SAVE_KEY = "cedar-table.hand.v1";
export const HISTORY_KEY = "cedar-table.history.v1";
export const HISTORY_LIMIT = 50;
const VERSION = 1;
const HISTORY_VERSION = 1;
const CANONICAL_TILES = new Map(createWall(() => 0).map((tile) => [tile.id, tile]));

function sameTile(tile) {
  const canonical = tile && CANONICAL_TILES.get(tile.id);
  return (
    Boolean(canonical) &&
    canonical.suit === tile.suit &&
    canonical.rank === tile.rank &&
    canonical.honor === tile.honor
  );
}
function isTileList(value) {
  return Array.isArray(value) && value.every(sameTile);
}
function isPlayerLists(value) {
  return Array.isArray(value) && value.length === 4 && value.every(isTileList);
}
function allTiles(state) {
  return [
    ...state.wall,
    ...state.hands.flat(),
    ...state.discards.flat(),
    ...state.melds.flatMap((melds) => melds.flatMap((meld) => meld.tiles)),
    ...state.winningTiles.filter(Boolean),
  ];
}
function validMeld(meld) {
  if (
    !meld ||
    !["chii", "pon", "kan"].includes(meld.type) ||
    !isTileList(meld.tiles)
  ) {
    return false;
  }
  const keys = meld.tiles.map(tileKey);
  if (meld.type === "chii") {
    const ranks = meld.tiles.map((tile) => tile.rank).sort((a, b) => a - b);
    return (
      meld.tiles.length === 3 &&
      SUITS.includes(meld.tiles[0].suit) &&
      meld.tiles.every((tile) => tile.suit === meld.tiles[0].suit) &&
      ranks[1] === ranks[0] + 1 &&
      ranks[2] === ranks[1] + 1
    );
  }
  return (
    meld.tiles.length === (meld.type === "kan" ? 4 : 3) &&
    keys.every((key) => key === keys[0])
  );
}
function validState(state) {
  if (
    !state ||
    typeof state !== "object" ||
    !isTileList(state.wall) ||
    !isPlayerLists(state.hands) ||
    !isPlayerLists(state.discards)
  ) {
    return false;
  }
  if (
    !Array.isArray(state.melds) ||
    state.melds.length !== 4 ||
    !state.melds.every(
      (melds) => Array.isArray(melds) && melds.every(validMeld),
    )
  ) {
    return false;
  }
  if (
    !Array.isArray(state.winningTiles) ||
    state.winningTiles.length !== 4 ||
    !state.winningTiles.every((tile) => tile === null || sameTile(tile))
  ) {
    return false;
  }
  if (
    !Number.isInteger(state.turn) ||
    state.turn < 0 ||
    state.turn > 3 ||
    !["discard", "claim", "ended"].includes(state.phase) ||
    typeof state.message !== "string"
  ) {
    return false;
  }
  if (
    !(
      state.winner === null ||
      (Number.isInteger(state.winner) && state.winner >= 0 && state.winner < 4)
    ) ||
    typeof state.awaitingHuman !== "boolean" ||
    typeof state.tsumoEligible !== "boolean"
  ) {
    return false;
  }
  if (
    !Array.isArray(state.passedPlayers) ||
    new Set(state.passedPlayers).size !== state.passedPlayers.length ||
    !state.passedPlayers.every(
      (player) => Number.isInteger(player) && player >= 0 && player < 4,
    )
  ) {
    return false;
  }
  const tiles = allTiles(state);
  if (tiles.length !== 136 || new Set(tiles.map((tile) => tile.id)).size !== 136) return false;
  if (state.phase === "discard") return !state.lastDiscard && !state.awaitingHuman && state.winner === null && state.passedPlayers.length === 0;
  if (state.phase === "ended") {
    const winningTiles = state.winningTiles.filter(Boolean);
    return !state.lastDiscard && !state.awaitingHuman && !state.tsumoEligible && state.passedPlayers.length === 0 && (state.winner === null ? winningTiles.length === 0 : winningTiles.length <= 1) && (!winningTiles.length || Boolean(state.winningTiles[state.winner]));
  }
  if (!state.lastDiscard || !Number.isInteger(state.lastDiscard.player) || state.lastDiscard.player < 0 || state.lastDiscard.player > 3 || !sameTile(state.lastDiscard.tile) || state.winner !== null || state.tsumoEligible) return false;
  const discard = state.discards[state.lastDiscard.player].at(-1);
  if (!discard || discard.id !== state.lastDiscard.tile.id) return false;
  const normalized = { ...state, lastDiscard: { player: state.lastDiscard.player, tile: discard }, passedPlayers: new Set(state.passedPlayers) };
  const selected = selectedClaim(normalized);
  // A discard is saved before its scheduled claim resolver runs, so an
  // unawaited legal claim window must remain restorable.
  return !state.awaitingHuman || selected?.player === 0;
}

export function makeSave(state, activeMs, savedAt = Date.now(), paused = false, handId = null, completedAt = null, completedAtEstimated = false) {
  return {
    version: VERSION,
    savedAt,
    activeMs,
    paused,
    ...(typeof handId === "string" ? { handId } : {}),
    ...(Number.isFinite(completedAt) ? { completedAt } : {}),
    ...(completedAtEstimated ? { completedAtEstimated: true } : {}),
    state: { ...state, passedPlayers: [...state.passedPlayers] },
  };
}
export function restoreSave(raw) {
  try {
    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record || record.version !== VERSION || !Number.isFinite(record.savedAt) || !Number.isFinite(record.activeMs) || record.activeMs < 0 || typeof record.paused !== "boolean" || (record.handId !== undefined && typeof record.handId !== "string") || (record.completedAt !== undefined && !Number.isFinite(record.completedAt)) || (record.completedAtEstimated !== undefined && typeof record.completedAtEstimated !== "boolean") || !validState(record.state)) return null;
    const state = { ...record.state, passedPlayers: new Set(record.state.passedPlayers) };
    if (state.lastDiscard) {
      const discard = state.discards[state.lastDiscard.player].at(-1);
      if (!discard || discard.id !== state.lastDiscard.tile.id) return null;
      state.lastDiscard = { player: state.lastDiscard.player, tile: discard };
    }
    return { state, activeMs: record.activeMs, savedAt: record.savedAt, paused: record.paused, handId: record.handId ?? null, completedAt: record.completedAt ?? null, completedAtEstimated: record.completedAtEstimated ?? false };
  } catch {
    return null;
  }
}
export function saveToStorage(storage, state, activeMs, now = Date.now(), paused = false, handId = null, completedAt = null, completedAtEstimated = false) {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(makeSave(state, activeMs, now, paused, handId, completedAt, completedAtEstimated)));
    return { ok: true, savedAt: now };
  } catch {
    return { ok: false };
  }
}
function validHistoryEntry(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    typeof entry.handId === "string" &&
    entry.handId.length > 0 &&
    typeof entry.result === "string" &&
    entry.result.length > 0 &&
    (entry.winner === null || (Number.isInteger(entry.winner) && entry.winner >= 0 && entry.winner < 4)) &&
    Number.isFinite(entry.finishedAt) &&
    (entry.finishedAtEstimated === undefined || typeof entry.finishedAtEstimated === "boolean") &&
    Number.isFinite(entry.playedMs) &&
    entry.playedMs >= 0
  );
}
export function normalizeCompletedHistory(hands) {
  const seen = new Set();
  return (Array.isArray(hands) ? hands : [])
    .filter(validHistoryEntry)
    .filter((hand) => {
      if (seen.has(hand.handId)) return false;
      seen.add(hand.handId);
      return true;
    })
    .sort((a, b) => b.finishedAt - a.finishedAt)
    .slice(0, HISTORY_LIMIT);
}
export const HISTORY_RESULT_FILTERS = ["all", "east-wins", "losses", "draws"];

export function filterCompletedHistory(history, filter) {
  const hands = normalizeCompletedHistory(history);
  const selectedFilter = HISTORY_RESULT_FILTERS.includes(filter) ? filter : "all";
  const matchingHands = hands.filter((hand) => {
    if (selectedFilter === "east-wins") return hand.winner === 0;
    if (selectedFilter === "losses") return hand.winner !== null && hand.winner !== 0;
    if (selectedFilter === "draws") return hand.winner === null;
    return true;
  });
  return { filter: selectedFilter, hands: matchingHands, total: hands.length };
}

export function restoreHistory(raw) {
  try {
    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record || record.version !== HISTORY_VERSION || !Array.isArray(record.hands) || !record.hands.every(validHistoryEntry)) return null;
    return normalizeCompletedHistory(record.hands);
  } catch {
    return null;
  }
}
export function loadHistoryFromStorage(storage) {
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (raw === null) return { kind: "empty", hands: [] };
    const hands = restoreHistory(raw);
    if (hands) return { kind: "saved", hands };
    try { storage.removeItem(HISTORY_KEY); } catch {}
    return { kind: "damaged", hands: [] };
  } catch {
    return { kind: "unavailable", hands: [] };
  }
}
export function saveHistoryToStorage(storage, hands) {
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify({ version: HISTORY_VERSION, hands: normalizeCompletedHistory(hands) }));
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
export function addCompletedHand(history, entry) {
  if (!validHistoryEntry(entry)) return normalizeCompletedHistory(history);
  if (history.some((hand) => hand.handId === entry.handId)) return normalizeCompletedHistory(history);
  return normalizeCompletedHistory([...history, entry]);
}
export function addCompletedHandToStorage(storage, entry) {
  const loaded = loadHistoryFromStorage(storage);
  if (loaded.kind === "unavailable") return { ok: false, kind: loaded.kind, hands: [] };
  const hands = addCompletedHand(loaded.hands, entry);
  return { ok: saveHistoryToStorage(storage, hands).ok, kind: loaded.kind, hands };
}
export function loadFromStorage(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return { kind: "empty" };
    const save = restoreSave(raw);
    if (save) return { kind: "saved", save };
    try { storage.removeItem(SAVE_KEY); } catch {}
    return { kind: "damaged" };
  } catch {
    return { kind: "unavailable" };
  }
}
export function clearStorage(storage) {
  try {
    storage.removeItem(SAVE_KEY);
    return true;
  } catch {
    return false;
  }
}
