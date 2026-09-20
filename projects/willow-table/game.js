export const SUITS = ["m", "p", "s"];
export const WINDS = ["E", "S", "W", "N"];
export const DRAGONS = ["R", "G", "Wh"];
export const HONORS = [...WINDS, ...DRAGONS];

export const seatNames = ["East", "South", "West", "North"];

export function isTileCode(tile) {
  return (
    typeof tile === "string" &&
    (/^[1-9][mps]$/.test(tile) || HONORS.includes(tile))
  );
}

export function createWall(random = Math.random) {
  const wall = [];
  for (const suit of SUITS)
    for (let rank = 1; rank <= 9; rank++) {
      for (let copy = 0; copy < 4; copy++) wall.push(`${rank}${suit}`);
    }
  for (const honor of HONORS)
    for (let copy = 0; copy < 4; copy++) wall.push(honor);
  for (let i = wall.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [wall[i], wall[j]] = [wall[j], wall[i]];
  }
  return wall;
}

export function tileInfo(tile) {
  if (tile.length === 2 && SUITS.includes(tile[1])) {
    return { suit: tile[1], rank: Number(tile[0]), honor: false };
  }
  return { suit: "z", rank: HONORS.indexOf(tile) + 1, honor: true };
}

export function tileLabel(tile) {
  const info = tileInfo(tile);
  if (info.honor)
    return {
      E: "East",
      S: "South",
      W: "West",
      N: "North",
      R: "Red",
      G: "Green",
      Wh: "White",
    }[tile];
  return `${info.rank} ${{ m: "Characters", p: "Dots", s: "Bamboo" }[info.suit]}`;
}

export function tileShortLabel(tile) {
  const info = tileInfo(tile);
  if (info.honor)
    return {
      E: "E",
      S: "S",
      W: "W",
      N: "N",
      R: "Red",
      G: "Green",
      Wh: "White",
    }[tile];
  return `${info.rank}${{ m: "C", p: "D", s: "B" }[info.suit]}`;
}

export function tileClass(tile) {
  const info = tileInfo(tile);
  return info.honor
    ? tile === "R"
      ? "red"
      : tile === "G"
        ? "green"
        : "honor"
    : info.suit === "m"
      ? "characters"
      : info.suit === "p"
        ? "dots"
        : "bamboo";
}

export function sortTiles(tiles) {
  return [...tiles].sort((a, b) => {
    const x = tileInfo(a);
    const y = tileInfo(b);
    const suitOrder = { m: 0, p: 1, s: 2, z: 3 };
    return suitOrder[x.suit] - suitOrder[y.suit] || x.rank - y.rank;
  });
}

function countsFor(tiles) {
  const counts = new Map();
  for (const tile of tiles) counts.set(tile, (counts.get(tile) || 0) + 1);
  return counts;
}

function canCompleteMelds(counts, remaining) {
  if (remaining === 0) return true;
  const first = [...counts.keys()]
    .filter((tile) => counts.get(tile) > 0)
    .sort((a, b) => {
      const x = tileInfo(a);
      const y = tileInfo(b);
      return x.suit.localeCompare(y.suit) || x.rank - y.rank;
    })[0];
  if (!first) return false;
  const count = counts.get(first);
  if (count >= 3) {
    counts.set(first, count - 3);
    if (canCompleteMelds(counts, remaining - 3)) {
      counts.set(first, count);
      return true;
    }
    counts.set(first, count);
  }
  const { suit, rank, honor } = tileInfo(first);
  const second = `${rank + 1}${suit}`;
  const third = `${rank + 2}${suit}`;
  if (
    !honor &&
    rank <= 7 &&
    (counts.get(second) || 0) &&
    (counts.get(third) || 0)
  ) {
    counts.set(first, count - 1);
    counts.set(second, counts.get(second) - 1);
    counts.set(third, counts.get(third) - 1);
    if (canCompleteMelds(counts, remaining - 3)) {
      counts.set(first, count);
      counts.set(second, counts.get(second) + 1);
      counts.set(third, counts.get(third) + 1);
      return true;
    }
    counts.set(first, count);
    counts.set(second, counts.get(second) + 1);
    counts.set(third, counts.get(third) + 1);
  }
  return false;
}

/** A winning concealed portion is four melds plus a pair after accounting for exposed melds. */
export function isWinningHand(tiles, exposedMelds = 0) {
  if (
    !Array.isArray(tiles) ||
    !Number.isInteger(exposedMelds) ||
    exposedMelds < 0 ||
    exposedMelds > 4 ||
    !tiles.every(isTileCode)
  )
    return false;
  const needed = 14 - exposedMelds * 3;
  if (tiles.length !== needed) return false;
  const counts = countsFor(tiles);
  if ([...counts.values()].some((count) => count > 4)) return false;
  for (const [tile, count] of counts) {
    if (count < 2) continue;
    counts.set(tile, count - 2);
    if (canCompleteMelds(counts, needed - 2)) {
      counts.set(tile, count);
      return true;
    }
    counts.set(tile, count);
  }
  return false;
}

export function canRon(hand, discard, exposedMelds = 0) {
  return isWinningHand([...hand, discard], exposedMelds);
}

export function canPon(hand, discard) {
  return hand.filter((tile) => tile === discard).length >= 2;
}

/** Returns all legal two-tile combinations in a hand that form a chi with a discard. */
export function chiOptions(hand, discard) {
  const { suit, rank, honor } = tileInfo(discard);
  if (honor) return [];
  const options = [];
  for (const [a, b] of [
    [rank - 2, rank - 1],
    [rank - 1, rank + 1],
    [rank + 1, rank + 2],
  ]) {
    if (a < 1 || b > 9) continue;
    const first = `${a}${suit}`,
      second = `${b}${suit}`;
    const available = [...hand];
    const one = available.indexOf(first);
    if (one < 0) continue;
    available.splice(one, 1);
    if (available.includes(second)) options.push([first, second]);
  }
  return options;
}

export function legalClaims(hand, discard, isNextPlayer, exposedMelds = 0) {
  return {
    ron: canRon(hand, discard, exposedMelds),
    pon: canPon(hand, discard),
    chi: isNextPlayer ? chiOptions(hand, discard) : [],
  };
}

export function chooseDiscard(hand) {
  const counts = countsFor(hand);
  const isolated = hand.filter((tile) => {
    const { suit, rank, honor } = tileInfo(tile);
    if (honor) return counts.get(tile) === 1;
    return (
      counts.get(tile) === 1 &&
      !hand.includes(`${rank - 1}${suit}`) &&
      !hand.includes(`${rank + 1}${suit}`) &&
      !hand.includes(`${rank - 2}${suit}`) &&
      !hand.includes(`${rank + 2}${suit}`)
    );
  });
  return sortTiles(isolated.length ? isolated : hand)[0];
}

export function removeTiles(hand, tiles) {
  const next = [...hand];
  for (const tile of tiles) {
    const index = next.indexOf(tile);
    if (index < 0) throw new Error(`Tile ${tile} is not in hand.`);
    next.splice(index, 1);
  }
  return next;
}
