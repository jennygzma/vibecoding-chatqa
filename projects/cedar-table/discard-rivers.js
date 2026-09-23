export const DISCARD_SEATS = ["East", "South", "West", "North"];

export function discardRivers(state) {
  const claimable = state.lastDiscard;
  return {
    remainingTiles: state.wall.length,
    rivers: state.discards.map((tiles, player) => ({
      player,
      label: DISCARD_SEATS[player],
      count: tiles.length,
      tiles: tiles.map((tile) => ({
        tile,
        claimable: Boolean(
          claimable && claimable.player === player && claimable.tile.id === tile.id,
        ),
      })),
    })),
  };
}
