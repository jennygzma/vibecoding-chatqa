import { normalizeCompletedHistory } from "./persistence.js?v=13";

export const HISTORY_CSV_HEADER = [
  "hand_id",
  "result",
  "winner",
  "finished_at_utc",
  "finished_at_estimated",
  "played_ms",
  "played",
];

function spreadsheetSafe(value) {
  const text = String(value);
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  const text = spreadsheetSafe(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function finishedAtUtc(finishedAt) {
  try {
    return new Date(finishedAt).toISOString();
  } catch {
    return "";
  }
}

export function formatPlayedDuration(playedMs) {
  const seconds = Math.floor(playedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function winnerName(winner) {
  return winner === null ? "Draw" : ["East", "South", "West", "North"][winner];
}

export function buildHistoryCsv(history) {
  const rows = normalizeCompletedHistory(history).map((hand) => [
    hand.handId,
    hand.result,
    winnerName(hand.winner),
    finishedAtUtc(hand.finishedAt),
    String(Boolean(hand.finishedAtEstimated)),
    String(hand.playedMs),
    formatPlayedDuration(hand.playedMs),
  ]);
  return [HISTORY_CSV_HEADER, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n") + "\r\n";
}
