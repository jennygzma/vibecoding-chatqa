export function selectedHandIndex(length, index) {
  return Number.isInteger(index) && index >= 0 && index < length ? index : null;
}

export function nextHandIndex(length, index, key) {
  if (!length) return null;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  const current = selectedHandIndex(length, index);
  const start = current === null ? 0 : current;
  if (key === "ArrowLeft" || key === "ArrowUp")
    return (start - 1 + length) % length;
  if (key === "ArrowRight" || key === "ArrowDown") return (start + 1) % length;
  return current;
}

export function shouldRestoreHandFocus(activeArea) {
  return activeArea !== "settings" && activeArea !== "discard-history";
}
