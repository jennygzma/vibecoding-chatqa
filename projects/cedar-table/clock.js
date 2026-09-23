export function createActiveClock(now = () => performance.now()) {
  let totalMs = 0;
  let startedAt = null;

  function isRunning() {
    return startedAt !== null;
  }
  function elapsed() {
    return totalMs + (isRunning() ? now() - startedAt : 0);
  }
  function start() {
    if (!isRunning()) startedAt = now();
    return elapsed();
  }
  function stop() {
    if (isRunning()) {
      totalMs = elapsed();
      startedAt = null;
    }
    return totalMs;
  }
  function setElapsed(ms) {
    totalMs = ms;
    startedAt = null;
  }
  return { elapsed, isRunning, setElapsed, start, stop };
}
