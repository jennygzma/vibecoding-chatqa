import test from "node:test";
import assert from "node:assert/strict";
import { claim, discard, newGame, resolveClaims } from "./game.js";
import { restoreSave } from "./persistence.js";
import { discardRivers } from "./discard-rivers.js";
import { tileKey } from "./rules.js";

function takeTile(state, want) {
  const places = [state.wall, ...state.hands];
  for (const place of places) {
    const index = place.findIndex((tile) => tileKey(tile) === tileKey(want));
    if (index >= 0) return place.splice(index, 1)[0];
  }
}
function assertConserved(state) {
  const tiles = [
    state.wall,
    ...state.hands,
    ...state.melds.flatMap((melds) => melds.map((meld) => meld.tiles)),
    ...state.discards,
    state.winningTiles.filter(Boolean),
  ].flat();
  assert.equal(tiles.length, 136);
  assert.equal(new Set(tiles.map((tile) => tile.id)).size, 136);
}
function saveRecord(state) {
  return JSON.stringify({
    version: 1,
    savedAt: 1000,
    activeMs: 4200,
    paused: true,
    state: { ...state, passedPlayers: [...state.passedPlayers] },
  });
}

test("projects public rivers in seat and discard order without reading or mutating hands", () => {
  const state = newGame(() => 0.5);
  const first = state.hands[0][0];
  discard(state, 0, 0);
  const second = takeTile(state, { suit: "dots", rank: 4 });
  state.discards[0].push(second);
  const before = structuredClone(state);
  const publicState = {
    discards: state.discards,
    lastDiscard: state.lastDiscard,
    wall: state.wall,
    get hands() {
      throw new Error("discard river projection must not read concealed hands");
    },
  };

  const projection = discardRivers(publicState);

  assert.deepEqual(projection.rivers.map(({ label }) => label), ["East", "South", "West", "North"]);
  assert.deepEqual(projection.rivers.map(({ count }) => count), [2, 0, 0, 0]);
  assert.deepEqual(projection.rivers[0].tiles.map(({ tile }) => tile.id), [first.id, second.id]);
  assert.equal(projection.rivers[0].tiles[0].claimable, true);
  assert.equal(projection.rivers[0].tiles[1].claimable, false);
  assert.equal(projection.remainingTiles, state.wall.length);
  assert.deepEqual(state, before);
});

test("does not label a stale or wrong-seat last discard with the same face", () => {
  const state = newGame(() => 0.5);
  const first = takeTile(state, { suit: "bamboo", rank: 5 });
  const sameFace = takeTile(state, { suit: "bamboo", rank: 5 });
  state.discards[1].push(first);
  state.lastDiscard = { player: 2, tile: sameFace };

  assert.equal(discardRivers(state).rivers[1].tiles[0].claimable, false);
  state.lastDiscard = { player: 1, tile: sameFace };
  assert.equal(discardRivers(state).rivers[1].tiles[0].claimable, false);
});

test("uses exact physical IDs for duplicate faces and removes a claimed discard from its river", () => {
  const state = newGame(() => 0.5);
  const discarded = takeTile(state, { suit: "dots", rank: 4 });
  const sameFace = takeTile(state, { suit: "dots", rank: 4 });
  const one = takeTile(state, { suit: "dots", rank: 4 });
  const two = takeTile(state, { suit: "dots", rank: 4 });
  state.discards[1].push(discarded, sameFace);
  state.lastDiscard = { player: 1, tile: sameFace };
  state.hands[0].push(one, two);
  state.turn = 1;
  state.phase = "claim";
  state.tsumoEligible = false;

  const pending = discardRivers(state);
  assert.deepEqual(pending.rivers[1].tiles.map(({ tile }) => tile.id), [discarded.id, sameFace.id]);
  assert.deepEqual(pending.rivers[1].tiles.map(({ claimable }) => claimable), [false, true]);
  resolveClaims(state);
  claim(state, 0, "pon");

  const claimed = discardRivers(state);
  assert.deepEqual(claimed.rivers[1].tiles.map(({ tile }) => tile.id), [discarded.id]);
  assert.equal(claimed.rivers[1].tiles.some(({ tile }) => tile.id === sameFace.id), false);
  assert.equal(state.melds[0][0].tiles.some((tile) => tile.id === sameFace.id), true);
});

test("real Chii, Kan, and Ron claims remove the physical discard from the river", () => {
  const scenarios = [
    {
      type: "chii",
      tile: { suit: "bamboo", rank: 3 },
      hand: [{ suit: "bamboo", rank: 1 }, { suit: "bamboo", rank: 2 }],
      destination: "meld",
      player: 3,
    },
    {
      type: "kan",
      tile: { suit: "honor", honor: "red" },
      hand: [{ suit: "honor", honor: "red" }, { suit: "honor", honor: "red" }, { suit: "honor", honor: "red" }],
      destination: "meld",
      player: 1,
    },
    {
      type: "ron",
      tile: { suit: "bamboo", rank: 3 },
      hand: [
        { suit: "bamboo", rank: 1 }, { suit: "bamboo", rank: 2 },
        { suit: "characters", rank: 1 }, { suit: "characters", rank: 2 }, { suit: "characters", rank: 3 },
        { suit: "dots", rank: 1 }, { suit: "dots", rank: 2 }, { suit: "dots", rank: 3 },
        { suit: "honor", honor: "east" }, { suit: "honor", honor: "east" }, { suit: "honor", honor: "east" },
        { suit: "honor", honor: "north" }, { suit: "honor", honor: "north" },
      ],
      destination: "win",
      player: 1,
    },
  ];
  for (const scenario of scenarios) {
    const state = newGame(() => 0.5);
    state.wall.push(...state.hands[0]);
    state.hands[0] = [];
    const discarded = takeTile(state, scenario.tile);
    state.hands[0] = scenario.hand.map((tile) => takeTile(state, tile));
    state.discards[scenario.player].push(discarded);
    state.lastDiscard = { player: scenario.player, tile: discarded };
    state.turn = scenario.player;
    state.phase = "claim";
    state.tsumoEligible = false;
    assertConserved(state);

    resolveClaims(state);
    claim(state, 0, scenario.type);

    assert.equal(discardRivers(state).rivers[scenario.player].tiles.some(({ tile }) => tile.id === discarded.id), false, scenario.type);
    if (scenario.destination === "meld") {
      assert.equal(state.melds[0][0].tiles.some((tile) => tile.id === discarded.id), true, scenario.type);
    } else {
      assert.equal(state.winningTiles[0].id, discarded.id, scenario.type);
    }
    assertConserved(state);
  }
});

test("restores current public rivers and removes the claimed physical discard after a persisted Pon", () => {
  const state = newGame(() => 0.5);
  const discarded = takeTile(state, { suit: "honor", honor: "north" });
  const one = takeTile(state, { suit: "honor", honor: "north" });
  const two = takeTile(state, { suit: "honor", honor: "north" });
  state.discards[1].push(discarded);
  state.lastDiscard = { player: 1, tile: discarded };
  state.hands[0].push(one, two);
  state.turn = 1;
  state.phase = "claim";
  state.tsumoEligible = false;
  const restored = restoreSave(saveRecord(state));

  assert.ok(restored);
  assert.equal(discardRivers(restored.state).rivers[1].tiles.at(-1).claimable, true);
  resolveClaims(restored.state);
  claim(restored.state, 0, "pon");
  assert.equal(discardRivers(restored.state).rivers[1].tiles.some(({ tile }) => tile.id === discarded.id), false);
  assert.equal(restored.state.melds[0][0].tiles.some((tile) => tile.id === discarded.id), true);
});
