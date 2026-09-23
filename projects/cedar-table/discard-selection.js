export function canSelectEastDiscard(state, active) {
  return (
    active &&
    state?.phase === "discard" &&
    state.turn === 0 &&
    !state.awaitingHuman
  );
}

export function createDiscardSelection() {
  let selectedTileId = null;
  let confirming = false;

  function valid(state, active) {
    return (
      selectedTileId !== null &&
      canSelectEastDiscard(state, active) &&
      state.hands[0].some((tile) => tile.id === selectedTileId)
    );
  }

  function selected(state, active = true) {
    if (!valid(state, active)) {
      selectedTileId = null;
      confirming = false;
      return null;
    }
    return state.hands[0].find((tile) => tile.id === selectedTileId);
  }

  function select(state, tileId, active) {
    if (!canSelectEastDiscard(state, active) || !state.hands[0].some((tile) => tile.id === tileId)) {
      selectedTileId = null;
      confirming = false;
      return null;
    }
    selectedTileId = tileId;
    confirming = false;
    return selected(state, active);
  }

  function cancel() {
    selectedTileId = null;
    confirming = false;
  }

  function confirm(state, active) {
    if (confirming || !valid(state, active)) {
      cancel();
      return -1;
    }
    confirming = true;
    const index = state.hands[0].findIndex((tile) => tile.id === selectedTileId);
    selectedTileId = null;
    return index;
  }

  return { cancel, confirm, select, selected };
}
