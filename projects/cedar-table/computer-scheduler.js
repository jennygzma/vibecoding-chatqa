export function canScheduleAutomaticComputerStep({
  canRun,
  awaitingHuman,
  phase,
  turn,
}) {
  return canRun && !awaitingHuman && (phase === "claim" || (phase === "discard" && turn !== 0));
}

export function createComputerScheduler({
  setTimer = setTimeout,
  clearTimer = clearTimeout,
} = {}) {
  let timer = null;
  let generation = 0;

  function cancel() {
    generation += 1;
    if (timer !== null) clearTimer(timer);
    timer = null;
  }

  function schedule(delay, callback) {
    cancel();
    const currentGeneration = generation;
    timer = setTimer(() => {
      if (currentGeneration !== generation) return;
      timer = null;
      callback();
    }, delay);
  }

  function pending() {
    return timer !== null;
  }

  return { cancel, pending, schedule };
}
