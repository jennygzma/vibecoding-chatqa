export const SUITS = ["bamboo", "characters", "dots"];
export const HONORS = [
  "east",
  "south",
  "west",
  "north",
  "white",
  "green",
  "red",
];

export function createWall(random = Math.random) {
  const tiles = [];
  for (const suit of SUITS)
    for (let rank = 1; rank <= 9; rank += 1)
      for (let copy = 0; copy < 4; copy += 1)
        tiles.push({ id: `${suit}-${rank}-${copy}`, suit, rank });
  for (const honor of HONORS)
    for (let copy = 0; copy < 4; copy += 1)
      tiles.push({ id: `${honor}-${copy}`, suit: "honor", honor });
  for (let i = tiles.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export function tileKey(tile) {
  return tile.suit === "honor"
    ? `h:${tile.honor}`
    : `${tile.suit}:${tile.rank}`;
}
export function sortTiles(tiles) {
  return [...tiles].sort((a, b) => tileKey(a).localeCompare(tileKey(b)));
}

function countsFor(tiles) {
  const counts = new Map();
  for (const tile of tiles) {
    const key = tileKey(tile);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}
function numberedKey(suit, rank) {
  return `${suit}:${rank}`;
}

export function isWinningHand(tiles) {
  return isWinningHandWithMelds(tiles, 0);
}
export function isWinningHandWithMelds(tiles, openMelds) {
  const requiredMelds = 4 - openMelds;
  if (requiredMelds < 0 || tiles.length !== requiredMelds * 3 + 2) return false;
  const counts = countsFor(tiles);
  const memo = new Map();
  function search(remainingMelds) {
    const signature = `${remainingMelds}|${[...counts.entries()]
      .filter(([, count]) => count)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `${key}:${count}`)
      .join(",")}`;
    if (memo.has(signature)) return memo.get(signature);
    const first = [...counts.keys()]
      .filter((key) => counts.get(key) > 0)
      .sort()[0];
    if (!first) return remainingMelds === 0;
    if (remainingMelds === 0) return false;
    const count = counts.get(first);
    let result = false;
    if (count >= 3) {
      counts.set(first, count - 3);
      result = search(remainingMelds - 1);
      counts.set(first, count);
    }
    const [suit, value] = first.split(":");
    const rank = Number(value);
    if (!result && SUITS.includes(suit) && rank <= 7) {
      const second = numberedKey(suit, rank + 1),
        third = numberedKey(suit, rank + 2);
      if ((counts.get(second) || 0) > 0 && (counts.get(third) || 0) > 0) {
        counts.set(first, count - 1);
        counts.set(second, counts.get(second) - 1);
        counts.set(third, counts.get(third) - 1);
        result = search(remainingMelds - 1);
        counts.set(first, count);
        counts.set(second, counts.get(second) + 1);
        counts.set(third, counts.get(third) + 1);
      }
    }
    memo.set(signature, result);
    return result;
  }
  for (const [pairKey, pairCount] of counts) {
    if (pairCount < 2) continue;
    counts.set(pairKey, pairCount - 2);
    if (search(requiredMelds)) return true;
    counts.set(pairKey, pairCount);
  }
  return false;
}

export function canPon(hand, tile) {
  return hand.filter((entry) => tileKey(entry) === tileKey(tile)).length >= 2;
}
export function canKan(hand, tile) {
  return hand.filter((entry) => tileKey(entry) === tileKey(tile)).length >= 3;
}
export function chiiOptions(hand, tile) {
  if (!SUITS.includes(tile.suit)) return [];
  const ranks = new Set(
    hand.filter((entry) => entry.suit === tile.suit).map((entry) => entry.rank),
  );
  return [
    [tile.rank - 2, tile.rank - 1],
    [tile.rank - 1, tile.rank + 1],
    [tile.rank + 1, tile.rank + 2],
  ].filter((pair) =>
    pair.every((rank) => rank >= 1 && rank <= 9 && ranks.has(rank)),
  );
}
export function canChii(hand, tile) {
  return chiiOptions(hand, tile).length > 0;
}
export function takeMatching(hand, tile, amount) {
  const remaining = [...hand];
  const taken = [];
  for (let index = 0; index < amount; index += 1) {
    const matchIndex = remaining.findIndex(
      (entry) => tileKey(entry) === tileKey(tile),
    );
    if (matchIndex < 0) return null;
    taken.push(remaining.splice(matchIndex, 1)[0]);
  }
  return { remaining, taken };
}

export function removeMatching(hand, tile, amount) {
  return takeMatching(hand, tile, amount)?.remaining ?? null;
}
export function analyzeDiscardWaits(hand, melds, discards) {
  const visible = uniqueVisibleTiles([
    ...hand,
    ...melds.flatMap((playerMelds) => playerMelds.flatMap((meld) => meld.tiles)),
    ...discards.flat(),
  ]);
  const visibleCounts = countsFor(visible);
  const candidates = new Map();
  for (const discard of hand) {
    const discardKey = tileKey(discard);
    if (candidates.has(discardKey)) continue;
    const remaining = [...hand];
    remaining.splice(remaining.indexOf(discard), 1);
    const winningTiles = tileTypes().filter(
      (winningTile) =>
        (visibleCounts.get(tileKey(winningTile)) || 0) < 4 &&
        isWinningHandWithMelds(
          [...remaining, winningTile],
          melds[0].length,
        ),
    );
    if (winningTiles.length) candidates.set(discardKey, { discard, winningTiles });
  }
  return [...candidates.values()];
}

function uniqueVisibleTiles(tiles) {
  const ids = new Set();
  return tiles.filter((tile) => {
    if (typeof tile.id !== "string" || !tile.id) return true;
    if (ids.has(tile.id)) return false;
    ids.add(tile.id);
    return true;
  });
}

function tileTypes() {
  return [
    ...SUITS.flatMap((suit) =>
      Array.from({ length: 9 }, (_, index) => ({ suit, rank: index + 1 })),
    ),
    ...HONORS.map((honor) => ({ suit: "honor", honor })),
  ];
}

export function tileLabel(tile) {
  if (tile.suit === "honor")
    return {
      east: "East",
      south: "South",
      west: "West",
      north: "North",
      white: "White",
      green: "Green",
      red: "Red",
    }[tile.honor];
  return `${tile.rank} ${{ bamboo: "Bamboo", characters: "Characters", dots: "Dots" }[tile.suit]}`;
}
