import { isTileCode, isWinningHand, legalClaims, removeTiles } from "./game.js";

const priority = { ron: 3, pon: 2, chi: 1 };
export const nextSeat = (seat) => (seat + 1) % 4;
export const seatDistance = (from, to) => (to - from + 4) % 4;
const noClaims = () => ({ ron: false, pon: false, chi: [] });

function isMeld(meld) {
  if (!Array.isArray(meld) || meld.length !== 3 || !meld.every(isTileCode))
    return false;
  if (meld.every((tile) => tile === meld[0])) return true;
  const sorted = [...meld].sort();
  const match = sorted.map((tile) => /^(\d)([mps])$/.exec(tile));
  return (
    match.every(Boolean) &&
    match.every((item) => item[2] === match[0][2]) &&
    Number(match[1][1]) === Number(match[0][1]) + 1 &&
    Number(match[2][1]) === Number(match[0][1]) + 2
  );
}
function allTiles(state) {
  return [
    ...(state.wall || []),
    ...state.players.flatMap((player) => [
      ...player.hand,
      ...player.discards,
      ...player.melds.flat(),
    ]),
  ];
}
/** Validates the serializable state shape used by all turn transitions. */
export function isValidRound(state) {
  if (
    !state ||
    !Array.isArray(state.players) ||
    state.players.length !== 4 ||
    !["draw", "discard", "claim", "ended"].includes(state.phase) ||
    !Number.isInteger(state.turn) ||
    state.turn < 0 ||
    state.turn > 3
  )
    return false;
  if (
    !Array.isArray(state.wall) ||
    !state.players.every(
      (player) =>
        player &&
        typeof player === "object" &&
        Array.isArray(player.hand) &&
        Array.isArray(player.discards) &&
        Array.isArray(player.melds) &&
        (!player.discardHistory || Array.isArray(player.discardHistory)) &&
        player.melds.length <= 4 &&
        player.melds.every(isMeld),
    )
  )
    return false;
  if (state.lastDiscard !== null && !isTileCode(state.lastDiscard))
    return false;
  if (
    state.lastDiscarder !== null &&
    (!Number.isInteger(state.lastDiscarder) ||
      state.lastDiscarder < 0 ||
      state.lastDiscarder > 3)
  )
    return false;
  if (
    state.phase === "claim" &&
    (state.lastDiscarder === null ||
      !state.lastDiscard ||
      state.players[state.lastDiscarder].discards.at(-1) !== state.lastDiscard)
  )
    return false;
  const counts = new Map();
  for (const tile of allTiles(state)) {
    if (!isTileCode(tile)) return false;
    counts.set(tile, (counts.get(tile) || 0) + 1);
    if (counts.get(tile) > 4) return false;
  }
  return true;
}
export function canSelfDraw(state, seat = state?.turn) {
  if (
    !isValidRound(state) ||
    state.phase !== "discard" ||
    state.turn !== seat ||
    state.turnStartedByDraw !== true
  )
    return false;
  const player = state.players[seat];
  return isWinningHand(player.hand, player.melds.length);
}
/** Returns this seat's legal choices. The discarder is never a claimant. */
export function claimChoices(state, seat) {
  if (
    !isValidRound(state) ||
    !Number.isInteger(seat) ||
    seat < 0 ||
    seat > 3 ||
    state.phase !== "claim" ||
    !state.lastDiscard ||
    seat === state.lastDiscarder
  )
    return noClaims();
  const player = state.players[seat];
  return legalClaims(
    player.hand,
    state.lastDiscard,
    nextSeat(state.lastDiscarder) === seat,
    player.melds.length,
  );
}
function validUserChoice(choice, choices) {
  if (choice === null) return true;
  if (
    !choice ||
    !["ron", "pon", "chi"].includes(choice.type) ||
    !choices[choice.type]
  )
    return false;
  return (
    choice.type !== "chi" ||
    (Number.isInteger(choice.option) &&
      choice.option >= 0 &&
      choice.option < choices.chi.length)
  );
}
/** A computer elects its highest legal claim; the user choice is validated first. */
export function claimCandidates(state, userChoice = null) {
  if (!isValidRound(state) || state.phase !== "claim" || !state.lastDiscard)
    return [];
  const userChoices = claimChoices(state, 0);
  if (!validUserChoice(userChoice, userChoices)) return null;
  const candidates = [];
  for (let seat = 0; seat < 4; seat++) {
    if (seat === state.lastDiscarder) continue;
    const choices = claimChoices(state, seat);
    const requested =
      seat === 0
        ? userChoice?.type
        : choices.ron
          ? "ron"
          : choices.pon
            ? "pon"
            : choices.chi.length
              ? "chi"
              : null;
    if (
      !requested ||
      !choices[requested] ||
      (requested === "chi" && !choices.chi.length)
    )
      continue;
    candidates.push({
      seat,
      type: requested,
      tiles:
        requested === "chi"
          ? choices.chi[seat === 0 ? userChoice.option : 0]
          : null,
    });
  }
  return candidates;
}
/** Higher claim type wins. Equal types are won by the closest seat after the discarder. */
export function chooseClaim(state, candidates) {
  if (!isValidRound(state) || !Array.isArray(candidates)) return null;
  return (
    [...candidates].sort(
      (a, b) =>
        priority[b.type] - priority[a.type] ||
        seatDistance(state.lastDiscarder, a.seat) -
          seatDistance(state.lastDiscarder, b.seat),
    )[0] || null
  );
}
export function settleClaims(state, userChoice = null) {
  const candidates = claimCandidates(state, userChoice);
  if (candidates === null || !isValidRound(state) || state.phase !== "claim")
    return null;
  const winner = chooseClaim(state, candidates);
  return winner
    ? { kind: "claim", ...winner }
    : { kind: "advance", seat: nextSeat(state.lastDiscarder) };
}
export function applySettlement(state, settlement) {
  if (
    !isValidRound(state) ||
    !settlement ||
    !["claim", "advance"].includes(settlement.kind)
  )
    return null;
  const next = structuredClone(state);
  if (settlement.kind === "advance") {
    if (settlement.seat !== nextSeat(state.lastDiscarder)) return null;
    next.turn = settlement.seat;
    next.lastDiscard = null;
    next.phase = "draw";
    next.turnStartedByDraw = false;
    return next;
  }
  const expected = chooseClaim(
    state,
    claimCandidates(
      state,
      settlement.seat === 0
        ? {
            type: settlement.type,
            option:
              settlement.type === "chi"
                ? claimChoices(state, 0).chi.findIndex(
                    (option) =>
                      JSON.stringify(option) ===
                      JSON.stringify(settlement.tiles),
                  )
                : undefined,
          }
        : null,
    ),
  );
  if (
    !expected ||
    expected.seat !== settlement.seat ||
    expected.type !== settlement.type ||
    JSON.stringify(expected.tiles) !== JSON.stringify(settlement.tiles)
  )
    return null;
  const claimant = next.players[settlement.seat],
    source = next.players[next.lastDiscarder],
    discard = next.lastDiscard;
  source.discards.pop();
  if (settlement.type === "ron") {
    claimant.hand.push(discard);
    next.phase = "ended";
    next.result = `Seat ${settlement.seat} wins by Ron.`;
    next.resultKind = "win";
    next.winnerSeat = settlement.seat;
    return next;
  }
  const used =
    settlement.type === "pon" ? [discard, discard] : settlement.tiles;
  claimant.hand = removeTiles(claimant.hand, used);
  claimant.melds.push([...used, discard]);
  next.turn = settlement.seat;
  next.lastDiscard = null;
  next.phase = "discard";
  next.turnStartedByDraw = false;
  return next;
}
export function discardTransition(state, seat, tile) {
  if (
    !isValidRound(state) ||
    !isTileCode(tile) ||
    state.phase !== "discard" ||
    state.turn !== seat ||
    !state.players[seat].hand.includes(tile)
  )
    return null;
  const next = structuredClone(state),
    player = next.players[seat];
  player.hand = removeTiles(player.hand, [tile]);
  player.discards.push(tile);
  (player.discardHistory ||= []).push(tile);
  next.lastDiscard = tile;
  next.lastDiscarder = seat;
  next.phase = "claim";
  next.turnStartedByDraw = false;
  return next;
}
export function drawTransition(state) {
  if (!isValidRound(state) || state.phase !== "draw") return null;
  const next = structuredClone(state);
  if (!next.wall.length) {
    next.phase = "ended";
    next.result = "The wall is exhausted. This hand is a draw.";
    next.resultKind = "draw";
    next.winnerSeat = null;
    return next;
  }
  next.players[next.turn].hand.push(next.wall.pop());
  next.phase = "discard";
  next.turnStartedByDraw = true;
  return next;
}
