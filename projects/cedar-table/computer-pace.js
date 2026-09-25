export const COMPUTER_PACE_KEY = "cedar-table.computer-pace.v1";
export const COMPUTER_PACES = {
  slow: { label: "Slow", delay: 1500 },
  normal: { label: "Normal", delay: 800 },
  fast: { label: "Fast", delay: 300 },
};
export const DEFAULT_COMPUTER_PACE = "normal";

export function normalizeComputerPace(value) {
  return Object.hasOwn(COMPUTER_PACES, value) ? value : DEFAULT_COMPUTER_PACE;
}

export function loadComputerPace(storage) {
  try {
    return normalizeComputerPace(storage?.getItem(COMPUTER_PACE_KEY));
  } catch {
    return DEFAULT_COMPUTER_PACE;
  }
}

export function saveComputerPace(storage, pace) {
  const normalized = normalizeComputerPace(pace);
  try {
    if (!storage) throw new Error("unavailable storage");
    storage.setItem(COMPUTER_PACE_KEY, normalized);
    return { ok: true, pace: normalized };
  } catch {
    return { ok: false, pace: normalized };
  }
}

export function applyComputerPaceChange(storage, pace) {
  const result = saveComputerPace(storage, pace);
  return {
    pace: result.pace,
    notice: result.ok ? "" : "Computer pace will apply for this page, but could not be saved.",
  };
}
