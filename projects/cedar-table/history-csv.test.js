import test from "node:test";
import assert from "node:assert/strict";
import { buildHistoryCsv, HISTORY_CSV_HEADER } from "./history-csv.js";

function hand(handId, winner, finishedAt, playedMs, extras = {}) {
  return {
    handId,
    result: winner === null ? "Draw" : `${["East", "South", "West", "North"][winner]} wins`,
    winner,
    finishedAt,
    playedMs,
    ...extras,
  };
}

function rows(csv) {
  return csv.trimEnd().split("\r\n");
}

test("exports the exact header, every winner, UTC dates, estimates, and active durations", () => {
  const csv = buildHistoryCsv([
    hand("east", 0, Date.UTC(2026, 0, 2, 3, 4, 5), 61_999),
    hand("south", 1, Date.UTC(2026, 0, 2, 3, 4, 6), 3_600_000, { finishedAtEstimated: true }),
    hand("west", 2, Date.UTC(2026, 0, 2, 3, 4, 7), 0),
    hand("north", 3, Date.UTC(2026, 0, 2, 3, 4, 8), 999),
    hand("draw", null, Date.UTC(2026, 0, 2, 3, 4, 9), 125_000),
  ]);

  assert.equal(HISTORY_CSV_HEADER.join(","), "hand_id,result,winner,finished_at_utc,finished_at_estimated,played_ms,played");
  assert.deepEqual(rows(csv), [
    HISTORY_CSV_HEADER.join(","),
    "draw,Draw,Draw,2026-01-02T03:04:09.000Z,false,125000,2:05",
    "north,North wins,North,2026-01-02T03:04:08.000Z,false,999,0:00",
    "west,West wins,West,2026-01-02T03:04:07.000Z,false,0,0:00",
    "south,South wins,South,2026-01-02T03:04:06.000Z,true,3600000,60:00",
    "east,East wins,East,2026-01-02T03:04:05.000Z,false,61999,1:01",
  ]);
  assert.match(csv, /\r\n/);
  assert.ok(csv.endsWith("\r\n"));
});

test("escapes CSV content and protects =, +, -, and @ formula text after whitespace", () => {
  const csv = buildHistoryCsv([
    hand(" +SUM(A1)", 0, 4, 4_000, { result: "ordinary Unicode: 西風 café" }),
    hand("\t-1+1", 1, 3, 3_000, { result: "CRLF\r\ninside" }),
    hand(" =SUM(A1)", 2, 2, 2_000, { result: ' \t@cmd,"quoted"\r\nnext' }),
    hand("普通-手", 3, 1, 1_000),
  ]);

  assert.equal(csv, [
    HISTORY_CSV_HEADER.join(","),
    "' +SUM(A1),ordinary Unicode: 西風 café,East,1970-01-01T00:00:00.004Z,false,4000,0:04",
    "'\t-1+1,\"CRLF\r\ninside\",South,1970-01-01T00:00:00.003Z,false,3000,0:03",
    "' =SUM(A1),\"' \t@cmd,\"\"quoted\"\"\r\nnext\",West,1970-01-01T00:00:00.002Z,false,2000,0:02",
    "普通-手,North wins,North,1970-01-01T00:00:00.001Z,false,1000,0:01",
    "",
  ].join("\r\n"));
});

test("exports the first valid retained duplicate as an exact West row with fractional Played milliseconds", () => {
  const timestamp = Date.UTC(2026, 8, 23, 2, 9, 56, 193);
  const csv = buildHistoryCsv([
    { handId: "retained-duplicate", result: "", winner: 0, finishedAt: timestamp - 2, playedMs: 1 },
    hand("retained-duplicate", 2, timestamp, 235602.40000000224, {
      result: "West wins by Ron",
      finishedAtEstimated: true,
    }),
    hand("retained-duplicate", 0, timestamp + 1, 1_000, { result: "East wins" }),
  ]);

  assert.equal(csv, [
    HISTORY_CSV_HEADER.join(","),
    "retained-duplicate,West wins by Ron,West,2026-09-23T02:09:56.193Z,true,235602.40000000224,3:55",
    "",
  ].join("\r\n"));
});

test("exports only valid, first-valid duplicate, newest 50 retained records without mutation", () => {
  const invalidDuplicate = { handId: "duplicate", result: "", winner: 0, finishedAt: 999, playedMs: 1 };
  const firstValidDuplicate = hand("duplicate", 2, 1, 10);
  const laterDuplicate = hand("duplicate", 0, 1000, 20);
  const retained = Array.from({ length: 51 }, (_, index) => hand(`hand-${index}`, 0, index + 2, index));
  const history = [invalidDuplicate, firstValidDuplicate, laterDuplicate, ...retained];
  const original = structuredClone(history);
  const exportedRows = rows(buildHistoryCsv(history));

  assert.equal(exportedRows.length, 51);
  assert.match(exportedRows[1], /^hand-50,/);
  assert.match(exportedRows.at(-1), /^hand-1,/);
  assert.deepEqual(history, original);
});

test("exports a header for empty or invalid input and leaves an unrepresentable retained date blank", () => {
  const unrepresentableDate = hand("far-future", null, 9e15, 2_000);
  const csv = buildHistoryCsv([null, { handId: "unfinished", winner: 0 }, unrepresentableDate]);

  assert.deepEqual(rows(csv), [
    HISTORY_CSV_HEADER.join(","),
    "far-future,Draw,Draw,,false,2000,0:02",
  ]);
  assert.equal(buildHistoryCsv([]), `${HISTORY_CSV_HEADER.join(",")}\r\n`);
});
