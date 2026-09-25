import {
  claim,
  computerTurn,
  discard,
  newGame,
  pass,
  PLAYERS,
  resolveClaims,
  selectedClaim,
  tsumo,
} from "./game.js?v=13";
import { createActiveClock } from "./clock.js?v=13";
import {
  applyComputerPaceChange,
  COMPUTER_PACES,
  loadComputerPace,
} from "./computer-pace.js?v=13";
import {
  canScheduleAutomaticComputerStep,
  createComputerScheduler,
} from "./computer-scheduler.js?v=13";
import {
  addCompletedHandToStorage,
  clearStorage,
  loadFromStorage,
  filterCompletedHistory,
  loadHistoryFromStorage,
  saveToStorage,
} from "./persistence.js?v=13";
import {
  analyzeDiscardWaits,
  isWinningHandWithMelds,
  tileLabel,
} from "./rules.js?v=13";
import { discardRivers } from "./discard-rivers.js?v=13";
import { createDiscardSelection } from "./discard-selection.js?v=13";
import { buildHistoryCsv, formatPlayedDuration } from "./history-csv.js?v=13";
import { deriveHistoryStatistics } from "./statistics.js?v=13";

const $ = (id) => document.getElementById(id);
const clock = createActiveClock();
const computerScheduler = createComputerScheduler();
const discardSelection = createDiscardSelection();
let state = newGame();
let clockTimer;
let computerPace = "normal";
let computerPaceNotice = "";
let savedAt = null;
let paused = false;
let hidden = document.hidden;
let waitingToContinue = false;
let storageNotice = "";
let historyNotice = "";
let historyExportNotice = "";
let history = [];
let historyResultFilter = "all";
let handId = createHandId();
let completedAt = null;
let completedAtEstimated = false;
let practiceHints = null;

function clearPracticeHints() {
  practiceHints = null;
}
function canAnalyzeHand() {
  return (
    canRun() &&
    state.phase === "discard" &&
    state.turn === 0 &&
    !state.awaitingHuman
  );
}

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function createHandId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function completedResult() {
  return state.winner === null ? "Draw" : state.message.replace(/!$/, "");
}
function canRun() {
  return !paused && !hidden && !waitingToContinue && state.phase !== "ended";
}
const formatDuration = formatPlayedDuration;
function formatSavedAt(time) {
  return time
    ? new Date(time).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not saved yet";
}
function save(force = false) {
  if (waitingToContinue && !force) return;
  const localStorage = storage();
  if (!localStorage) {
    storageNotice = "Local saving is unavailable in this browser. This hand will still play normally, but cannot be continued after closing.";
    return;
  }
  const result = saveToStorage(
    localStorage,
    state,
    clock.elapsed(),
    Date.now(),
    paused || hidden || state.phase === "ended",
    handId,
    completedAt,
    completedAtEstimated,
  );
  if (result.ok) savedAt = result.savedAt;
  else storageNotice = "Local saving is unavailable in this browser. This hand will still play normally, but cannot be continued after closing.";
}
function saveCompletedHand() {
  if (state.phase !== "ended") return;
  if (!completedAt) completedAt = Date.now();
  const localStorage = storage();
  if (!localStorage) {
    historyNotice = "History cannot be saved because local storage is unavailable.";
    return;
  }
  const savedHistory = addCompletedHandToStorage(localStorage, {
    handId,
    result: completedResult(),
    winner: state.winner,
    finishedAt: completedAt,
    finishedAtEstimated: completedAtEstimated || undefined,
    playedMs: clock.elapsed(),
  });
  history = savedHistory.hands;
  if (!savedHistory.ok) {
    historyNotice = "History could not be saved. Your current hand is unaffected.";
  } else {
    historyNotice = savedHistory.kind === "damaged"
      ? "Saved history was damaged and has been reset. Your current hand is unaffected."
      : "";
  }
}
function startClock() {
  if (canRun()) clock.start();
  clearInterval(clockTimer);
  if (clock.isRunning()) clockTimer = setInterval(renderClock, 250);
}
function stopClock() {
  clock.stop();
  clearInterval(clockTimer);
}
function renderClock() {
  $("save-time").textContent = `Last saved: ${formatSavedAt(savedAt)} · Played: ${formatDuration(clock.elapsed())}`;
}
function act(action) {
  discardSelection.cancel();
  clearPracticeHints();
  action();
  if (state.phase === "ended") {
    stopClock();
    saveCompletedHand();
  }
  save();
  render();
  schedule();
}
function tileNode(tile, interactive = false, winning = false) {
  const node = document.createElement(interactive ? "button" : "div");
  const selected = interactive && discardSelection.selected(state, canRun())?.id === tile.id;
  node.className = `tile ${tile.suit}${interactive ? " tile-button" : ""}${winning ? " winning-tile" : ""}`;
  node.title = `${tileLabel(tile)}${winning ? " — winning tile" : ""}`;
  node.dataset.tileId = tile.id;
  node.innerHTML = `<span class="rank">${tile.suit === "honor" ? tileLabel(tile)[0] : tile.rank}</span><span>${tile.suit === "honor" ? tileLabel(tile) : tile.suit}</span>`;
  if (interactive) {
    node.disabled = !canRun() || state.phase !== "discard" || state.turn !== 0 || state.awaitingHuman;
    node.setAttribute("aria-pressed", String(selected));
    node.addEventListener("click", () => {
      discardSelection.select(state, tile.id, canRun());
      render();
    });
  }
  return node;
}
function renderMelds(target, index) {
  target.replaceChildren();
  state.melds[index].forEach((meld) => {
    const group = document.createElement("div");
    group.className = "meld-group";
    group.title = meld.type.toUpperCase();
    meld.tiles.forEach((tile) => group.append(tileNode(tile)));
    target.append(group);
  });
}
function renderSeat(index, id) {
  const seat = $(id);
  seat.replaceChildren();
  seat.dataset.name = `${PLAYERS[index]} · ${state.hands[index].length} concealed`;
  const concealed = document.createElement("div");
  concealed.className = "concealed";
  state.hands[index].forEach(() => {
    concealed.append(Object.assign(document.createElement("span"), { className: "tiny" }));
  });
  const melds = document.createElement("div");
  melds.className = "melds";
  renderMelds(melds, index);
  seat.append(concealed, melds);
}
function renderDiscards() {
  const projection = discardRivers(state);
  const target = $("discard-rivers");
  target.replaceChildren();
  $("discard-remaining").textContent = `${projection.remainingTiles} tiles remaining`;
  projection.rivers.forEach(({ label, count, tiles }) => {
    const river = document.createElement("section");
    river.className = "discard-river";
    const heading = document.createElement("h3");
    heading.textContent = `${label} — ${count} ${count === 1 ? "tile" : "tiles"} still in river`;
    const tilesNode = document.createElement("div");
    tilesNode.className = "river-tiles";
    if (!tiles.length) {
      const empty = document.createElement("p");
      empty.className = "empty-river";
      empty.textContent = "No discards yet.";
      tilesNode.append(empty);
    } else {
      tiles.forEach(({ tile, claimable }) => {
        const group = document.createElement("div");
        group.className = "river-tile-group";
        const displayTile = tileNode(tile);
        displayTile.classList.add("river-tile");
        group.append(displayTile);
        if (claimable) {
          displayTile.classList.add("claimable-discard");
          displayTile.title = `${tileLabel(tile)} — current claimable discard`;
          const label = document.createElement("span");
          label.className = "claimable-label";
          label.textContent = "Current claimable";
          group.append(label);
        }
        tilesNode.append(group);
      });
    }
    river.append(heading, tilesNode);
    target.append(river);
  });
}
function addButton(target, label, action) {
  const button = document.createElement("button");
  button.textContent = label;
  button.addEventListener("click", () => act(action));
  target.append(button);
}
function renderStatistics() {
  const statistics = deriveHistoryStatistics(history);
  const empty = $("statistics-empty");
  const target = $("statistics-list");
  target.replaceChildren();
  empty.textContent = statistics.completedHands
    ? ""
    : "Complete a hand to see statistics for the latest 50 saved results.";
  [
    ["Completed hands", statistics.completedHands],
    ["East wins", statistics.eastWins],
    ["Losses", statistics.losses],
    ["Draws", statistics.draws],
    ["Win rate (East wins ÷ completed hands; draws included)", `${Math.round(statistics.winRate * 100)}%`],
    ["Total Played", formatDuration(statistics.totalPlayedMs)],
    ["Average Played", formatDuration(statistics.averagePlayedMs)],
  ].forEach(([label, value]) => {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value;
    item.append(term, description);
    target.append(item);
  });
}
function renderHistory() {
  const target = $("history-list");
  const filteredHistory = filterCompletedHistory(history, historyResultFilter);
  historyResultFilter = filteredHistory.filter;
  $("history-result-filter").value = historyResultFilter;
  $("export-history-csv").disabled = !filteredHistory.total;
  $("history-count").textContent = `Showing ${filteredHistory.hands.length} of ${filteredHistory.total} saved hands.`;
  target.replaceChildren();
  if (!filteredHistory.total) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "No completed hands yet.";
    target.append(empty);
  } else if (!filteredHistory.hands.length) {
    const empty = document.createElement("li");
    empty.className = "history-empty";
    empty.textContent = "No matching results. ";
    const showAll = document.createElement("button");
    showAll.className = "history-show-all";
    showAll.textContent = "Show all results";
    showAll.addEventListener("click", () => {
      historyResultFilter = "all";
      render();
    });
    empty.append(showAll);
    target.append(empty);
  } else {
    filteredHistory.hands.forEach((hand) => {
      const item = document.createElement("li");
      const result = document.createElement("strong");
      result.textContent = hand.result;
      const details = document.createElement("span");
      details.textContent = `${hand.finishedAtEstimated ? "Finished around" : "Finished"}: ${formatSavedAt(hand.finishedAt)} · Played: ${formatDuration(hand.playedMs)}`;
      item.append(result, details);
      target.append(item);
    });
  }
  $("history-export-notice").textContent = historyExportNotice;
  $("history-notice").textContent = historyNotice;
}
function renderPracticeHints() {
  const target = $("practice-hints");
  target.replaceChildren();
  target.hidden = !practiceHints;
  if (!practiceHints) return;
  const header = document.createElement("div");
  header.className = "practice-hints-header";
  const title = document.createElement("h3");
  title.textContent = "Practice hints";
  const collapse = document.createElement("button");
  collapse.textContent = "Collapse hints";
  collapse.addEventListener("click", () => {
    clearPracticeHints();
    render();
  });
  header.append(title, collapse);
  const explanation = document.createElement("p");
  explanation.textContent = "These are structural waits with unseen copies, not guaranteed draws or probabilities.";
  target.append(header, explanation);
  if (!practiceHints.length) {
    const empty = document.createElement("p");
    empty.textContent = "No discard leaves this hand one tile from a standard winning hand.";
    target.append(empty);
    return;
  }
  const list = document.createElement("ul");
  practiceHints.forEach(({ discard: candidate, winningTiles }) => {
    const item = document.createElement("li");
    item.textContent = `Discard ${tileLabel(candidate)} → ${winningTiles.map(tileLabel).join(", ")}.`;
    list.append(item);
  });
  target.append(list);
}
function renderDiscardConfirmation() {
  const target = $("discard-confirmation");
  target.replaceChildren();
  const selected = discardSelection.selected(state, canRun());
  if (!selected || !canRun()) return;
  const label = document.createElement("strong");
  label.textContent = `Selected: ${tileLabel(selected)}`;
  const confirm = document.createElement("button");
  confirm.textContent = "Confirm discard";
  confirm.addEventListener("click", () => {
    const index = discardSelection.confirm(state, canRun());
    if (index < 0) {
      render();
      return;
    }
    act(() => discard(state, 0, index));
  });
  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", () => {
    discardSelection.cancel();
    render();
  });
  target.append(label, confirm, cancel);
}
function renderClaims() {
  const target = $("claims");
  target.replaceChildren();
  if (!canRun()) return;
  if (
    state.phase === "discard" &&
    state.turn === 0 &&
    state.tsumoEligible &&
    isWinningHandWithMelds(state.hands[0], state.melds[0].length)
  ) {
    addButton(target, "TSUMO", () => tsumo(state));
  }
  if (state.awaitingHuman) {
    selectedClaim(state).types.forEach((type) => {
      addButton(target, type.toUpperCase(), () => claim(state, 0, type));
    });
    addButton(target, "Pass", () => pass(state));
  }
}
function render() {
  const focusedId = document.activeElement?.dataset?.tileId;
  const status = waitingToContinue
    ? "Saved hand ready — choose Continue hand before play resumes."
    : paused
      ? "Hand paused — no turns or timer are running."
      : hidden
        ? "Hand is paused while this page is hidden."
        : state.message;
  $("status").textContent = status;
  $("wall-count").textContent = `${state.wall.length} tiles left in wall`;
  $("last-discard").textContent = state.lastDiscard
    ? `${PLAYERS[state.lastDiscard.player]} discarded: ${tileLabel(state.lastDiscard.tile)}`
    : "";
  renderClock();
  $("save-notice").textContent = storageNotice;
  $("computer-pace-notice").textContent = computerPaceNotice;
  renderStatistics();
  renderHistory();
  $("continue-game").hidden = !waitingToContinue;
  $("computer-pace").value = computerPace;
  $("pause-game").textContent = paused ? "Resume" : "Pause";
  $("pause-game").disabled = waitingToContinue || hidden || state.phase === "ended";
  renderSeat(1, "south");
  renderSeat(2, "west");
  renderSeat(3, "north");
  renderDiscards();
  const hand = $("your-hand");
  hand.replaceChildren();
  state.hands[0].forEach((tile) => hand.append(tileNode(tile, true)));
  if (state.winner === 0 && state.winningTiles[0]) {
    hand.append(tileNode(state.winningTiles[0], false, true));
  }
  renderMelds($("your-melds"), 0);
  $("analyze-hand").disabled = !canAnalyzeHand();
  renderDiscardConfirmation();
  renderPracticeHints();
  renderClaims();
  $("hand-help").textContent = waitingToContinue
    ? "Your saved hand is unchanged until you continue it."
    : paused
      ? "Paused time does not count toward this hand."
      : hidden
        ? "Hidden time does not count toward this hand."
        : state.phase === "ended"
          ? "This hand is complete. Start a new hand to play again."
          : state.awaitingHuman
            ? "A prioritized call is available — choose it or pass."
            : state.turn === 0 && state.phase === "discard"
              ? "Your turn — select a tile, then confirm your discard."
              : "Computer players are taking their turns.";
  const restored = focusedId && hand.querySelector(`[data-tile-id="${focusedId}"]`);
  if (restored) restored.focus();
  else if (canRun() && state.phase === "discard" && state.turn === 0 && document.activeElement === document.body) {
    hand.querySelector("button:not(:disabled)")?.focus();
  }
}
function canScheduleComputerStep() {
  return canScheduleAutomaticComputerStep({
    canRun: canRun(),
    awaitingHuman: state.awaitingHuman,
    phase: state.phase,
    turn: state.turn,
  });
}
function schedule() {
  computerScheduler.cancel();
  if (!canScheduleComputerStep()) return;
  computerScheduler.schedule(COMPUTER_PACES[computerPace].delay, () => {
    if (!canScheduleComputerStep()) return;
    discardSelection.cancel();
    if (state.phase === "claim") {
      clearPracticeHints();
      resolveClaims(state);
    } else {
      clearPracticeHints();
      computerTurn(state);
    }
    if (state.phase === "ended") {
      stopClock();
      saveCompletedHand();
    }
    save();
    render();
    schedule();
  });
}
function togglePause() {
  discardSelection.cancel();
  clearPracticeHints();
  paused = !paused;
  if (paused) stopClock();
  else startClock();
  save();
  render();
  schedule();
}
function startNewHand() {
  if (!window.confirm("Start a new hand? Your saved hand will be permanently replaced.")) return;
  discardSelection.cancel();
  clearPracticeHints();
  computerScheduler.cancel();
  clearStorage(storage());
  state = newGame();
  handId = createHandId();
  completedAt = null;
  completedAtEstimated = false;
  clock.setElapsed(0);
  paused = false;
  waitingToContinue = false;
  storageNotice = "";
  savedAt = null;
  startClock();
  save();
  render();
  schedule();
}
function restore() {
  discardSelection.cancel();
  clearPracticeHints();
  const localStorage = storage();
  computerPace = loadComputerPace(localStorage);
  const loadedHistory = localStorage ? loadHistoryFromStorage(localStorage) : { kind: "unavailable", hands: [] };
  history = loadedHistory.hands;
  if (loadedHistory.kind === "damaged") {
    historyNotice = "Saved history was damaged and has been cleared. Your current hand is unaffected.";
  } else if (loadedHistory.kind === "unavailable") {
    historyNotice = "History is unavailable because local storage is blocked.";
  }
  const loaded = localStorage ? loadFromStorage(localStorage) : { kind: "unavailable" };
  if (loaded.kind === "saved") {
    state = loaded.save.state;
    clock.setElapsed(loaded.save.activeMs);
    savedAt = loaded.save.savedAt;
    paused = loaded.save.paused;
    handId = loaded.save.handId || createHandId();
    completedAt = loaded.save.completedAt || (state.phase === "ended" ? loaded.save.savedAt : null);
    completedAtEstimated = Number.isFinite(loaded.save.completedAt)
      ? loaded.save.completedAtEstimated
      : state.phase === "ended";
    waitingToContinue = true;
    if (state.phase === "ended") {
      saveCompletedHand();
      save(true);
    }
  } else if (loaded.kind === "damaged") {
    storageNotice = "An old saved hand was damaged and was removed. A new hand is ready to play.";
  } else if (loaded.kind === "unavailable") {
    storageNotice = "Local saving is unavailable in this browser. A new hand is ready to play.";
  }
  if (loaded.kind !== "saved") save();
}
function handleVisibility() {
  discardSelection.cancel();
  clearPracticeHints();
  hidden = document.hidden;
  if (hidden) {
    stopClock();
    computerScheduler.cancel();
    save();
  } else {
    startClock();
  }
  render();
  schedule();
}
function handlePageHide() {
  discardSelection.cancel();
  stopClock();
  computerScheduler.cancel();
  save();
}
$("analyze-hand").addEventListener("click", () => {
  if (!canAnalyzeHand()) return;
  practiceHints = analyzeDiscardWaits(state.hands[0], state.melds, state.discards);
  render();
});
$("computer-pace").addEventListener("change", (event) => {
  const changed = applyComputerPaceChange(storage(), event.target.value);
  computerPace = changed.pace;
  computerPaceNotice = changed.notice;
  render();
  schedule();
});
$("history-result-filter").addEventListener("change", (event) => {
  historyResultFilter = event.target.value;
  render();
});
$("export-history-csv").addEventListener("click", () => {
  let url;
  try {
    const csv = buildHistoryCsv(history);
    url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const download = document.createElement("a");
    download.href = url;
    download.download = "cedar-table-history.csv";
    download.click();
    historyExportNotice = "";
  } catch {
    historyExportNotice = "History CSV could not be prepared. Your saved history is unchanged.";
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
  render();
});
$("new-game").addEventListener("click", startNewHand);
$("pause-game").addEventListener("click", togglePause);
$("continue-game").addEventListener("click", () => {
  if (!waitingToContinue) return;
  discardSelection.cancel();
  clearPracticeHints();
  waitingToContinue = false;
  paused = false;
  startClock();
  save();
  render();
  schedule();
});
document.addEventListener("visibilitychange", handleVisibility);
window.addEventListener("pagehide", handlePageHide);
restore();
startClock();
render();
schedule();
