import {
  canChii,
  canKan,
  canPon,
  chiiOptions,
  createWall,
  isWinningHandWithMelds,
  sortTiles,
  takeMatching,
  tileKey,
  tileLabel,
} from "./rules.js?v=13";
export const PLAYERS = ["East (You)", "South", "West", "North"];
export function newGame(random = Math.random) {
  const wall = createWall(random),
    hands = PLAYERS.map(() => []);
  for (let round = 0; round < 13; round += 1)
    for (const hand of hands) hand.push(wall.pop());
  hands[0].push(wall.pop());
  return {
    wall,
    hands: hands.map(sortTiles),
    melds: PLAYERS.map(() => []),
    discards: PLAYERS.map(() => []),
    winningTiles: PLAYERS.map(() => null),
    turn: 0,
    phase: "discard",
    message: "East opens — discard a tile.",
    winner: null,
    lastDiscard: null,
    awaitingHuman: false,
    passedPlayers: new Set(),
    tsumoEligible: true,
  };
}
function wins(s, p, extra) {
  return isWinningHandWithMelds(
    extra ? [...s.hands[p], extra] : s.hands[p],
    s.melds[p].length,
  );
}
function order(p) {
  return [1, 2, 3].map((n) => (p + n) % 4);
}
export function claimsFor(s, p = 0) {
  const last = s.lastDiscard;
  if (
    !last ||
    s.phase !== "claim" ||
    p === last.player ||
    s.passedPlayers.has(p)
  )
    return {};
  const hand = s.hands[p];
  return {
    ron: wins(s, p, last.tile),
    pon: canPon(hand, last.tile),
    kan: canKan(hand, last.tile),
    chii: p === (last.player + 1) % 4 && canChii(hand, last.tile),
  };
}
export function selectedClaim(s) {
  if (s.phase !== "claim" || !s.lastDiscard) return null;
  const seats = order(s.lastDiscard.player),
    ron = seats.find((p) => claimsFor(s, p).ron);
  if (ron !== undefined) return { player: ron, types: ["ron"] };
  const caller = seats.find((p) => {
    const c = claimsFor(s, p);
    return c.pon || c.kan;
  });
  if (caller !== undefined) {
    const c = claimsFor(s, caller);
    return { player: caller, types: ["kan", "pon"].filter((t) => c[t]) };
  }
  const next = seats[0];
  return claimsFor(s, next).chii ? { player: next, types: ["chii"] } : null;
}
export function discard(s, p, i) {
  if (s.phase !== "discard" || s.turn !== p || !s.hands[p][i]) return s;
  const [tile] = s.hands[p].splice(i, 1);
  s.discards[p].push(tile);
  s.lastDiscard = { tile, player: p };
  s.phase = "claim";
  s.passedPlayers = new Set();
  s.awaitingHuman = false;
  s.tsumoEligible = false;
  s.message = `${PLAYERS[p]} discarded ${tileLabel(tile)}.`;
  return s;
}
export function resolveClaims(s) {
  if (s.phase !== "claim") return s;
  const selected = selectedClaim(s);
  if (!selected) return advance(s);
  if (selected.player === 0) {
    s.awaitingHuman = true;
    s.message = `${PLAYERS[s.lastDiscard.player]} discarded ${tileLabel(s.lastDiscard.tile)}. Call or pass.`;
    return s;
  }
  return claim(s, selected.player, selected.types[0]);
}
export function claim(s, p, type) {
  const selected = selectedClaim(s);
  if (!selected || selected.player !== p || !selected.types.includes(type))
    return s;
  const last = s.lastDiscard;
  if (type === "ron") {
    s.discards[last.player].pop();
    s.winningTiles[p] = last.tile;
    return end(s, p, "Ron");
  }
  let taken;
  if (type === "chii") {
    const ranks = chiiOptions(s.hands[p], last.tile)[0],
      one = takeMatching(
        s.hands[p],
        { suit: last.tile.suit, rank: ranks[0] },
        1,
      ),
      two = takeMatching(
        one.remaining,
        { suit: last.tile.suit, rank: ranks[1] },
        1,
      );
    s.hands[p] = two.remaining;
    taken = [...one.taken, ...two.taken];
  } else {
    const out = takeMatching(s.hands[p], last.tile, type === "kan" ? 3 : 2);
    s.hands[p] = out.remaining;
    taken = out.taken;
  }
  s.discards[last.player].pop();
  s.melds[p].push({ type, tiles: sortTiles([last.tile, ...taken]) });
  s.turn = p;
  s.phase = "discard";
  s.lastDiscard = null;
  s.awaitingHuman = false;
  s.passedPlayers = new Set();
  s.tsumoEligible = false;
  if (type === "kan") {
    draw(s, p, true);
    if (s.phase === "ended") return s;
  }
  s.hands[p] = sortTiles(s.hands[p]);
  s.message = `${PLAYERS[p]} claimed ${type.toUpperCase()}.`;
  return s;
}
export function tsumo(s, p = 0) {
  return s.phase === "discard" && s.turn === p && s.tsumoEligible && wins(s, p)
    ? end(s, p, "Tsumo")
    : s;
}
export function pass(s) {
  if (s.phase === "claim" && s.awaitingHuman) {
    s.passedPlayers.add(0);
    s.awaitingHuman = false;
  }
  return s;
}
export function advance(s) {
  s.lastDiscard = null;
  s.awaitingHuman = false;
  s.passedPlayers = new Set();
  s.turn = (s.turn + 1) % 4;
  return draw(s, s.turn);
}
function draw(s, p, replacement = false) {
  if (!s.wall.length) return endDraw(s);
  s.hands[p].push(s.wall.pop());
  s.hands[p] = sortTiles(s.hands[p]);
  s.phase = "discard";
  s.tsumoEligible = true;
  s.message = `${PLAYERS[p]} drew ${replacement ? "a replacement" : "a"} tile.`;
  return s;
}
export function computerTurn(s) {
  if (s.phase !== "discard" || s.turn === 0) return s;
  const p = s.turn;
  if (s.tsumoEligible && wins(s, p)) return end(s, p, "Tsumo");
  const counts = new Map();
  s.hands[p].forEach((t) =>
    counts.set(tileKey(t), (counts.get(tileKey(t)) || 0) + 1),
  );
  let i = s.hands[p].findIndex((t) => counts.get(tileKey(t)) === 1);
  if (i < 0) i = s.hands[p].length - 1;
  return discard(s, p, i);
}
function endDraw(s) {
  s.phase = "ended";
  s.tsumoEligible = false;
  s.message = "Exhaustive draw — the wall is empty.";
  return s;
}
function end(s, p, method) {
  s.phase = "ended";
  s.winner = p;
  s.awaitingHuman = false;
  s.lastDiscard = null;
  s.tsumoEligible = false;
  s.message = `${PLAYERS[p]} wins by ${method}!`;
  return s;
}
