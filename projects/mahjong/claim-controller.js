/** Schedules automatic claim settlement without closing a legal human claim window. */
export function createClaimController({
  getState,
  hasUserClaim,
  settle,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) {
  let timer,
    generation = 0;
  function cancel() {
    generation++;
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
  }
  function resume(delay) {
    const state = getState();
    if (
      state?.phase !== "claim" ||
      (state.lastDiscarder !== 0 && hasUserClaim(state))
    )
      return false;
    const token = generation;
    if (timer !== undefined) clearTimer(timer);
    timer = setTimer(() => {
      timer = undefined;
      if (token === generation && getState()?.phase === "claim") settle();
    }, delay);
    return true;
  }
  return { cancel, resume };
}
