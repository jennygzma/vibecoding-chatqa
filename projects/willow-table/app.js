import {
  createWall,
  sortTiles,
  tileInfo,
  tileShortLabel,
  tileClass,
  tileLabel,
  chooseDiscard,
} from "./game.js";
import {
  canSelfDraw,
  claimChoices,
  settleClaims,
  applySettlement,
  discardTransition,
  drawTransition,
  isValidRound,
} from "./transitions.js";
import {
  nextHandIndex,
  selectedHandIndex,
  shouldRestoreHandFocus,
} from "./hand-controls.js";
import { createClaimController } from "./claim-controller.js";
import {
  BACKUP_VERSION,
  createBackup,
  defaultPreferences,
  isValidPreferences,
  normalizeHistory,
  recordFinishedHand,
  readJson,
  validateBackup,
  writeJson,
  isValidSavedRound,
} from "./persistence.js";

const STORE = "willow-table-round-v1",
  PREFERENCES = "willow-table-preferences-v1",
  HISTORY = "willow-table-history-v1",
  $ = (s) => document.querySelector(s),
  browserStorage = () => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  };
let state,
  history = [],
  botTimer,
  generation = 0,
  selectedHand = null,
  handFocusIndex = null,
  preferences = defaultPreferences(),
  focusTarget = null,
  notice = "",
  historyFilter = "all";
const seatTitle = (i) => ["You · East", "South", "West", "North"][i],
  speedDelay = { slow: 1200, normal: 650, fast: 250 },
  handId = () => `hand-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );
const claimController = createClaimController({
  getState: () => state,
  hasUserClaim: () => hasUserClaim(),
  settle: () => settle(),
});

function status(message) {
  $("#save-status").textContent = message;
}
function save() {
  if (state.phase === "ended")
    history = recordFinishedHand(history, {
      id: state.handId,
      outcome: state.resultKind,
      winnerSeat: state.winnerSeat,
      winner: state.winnerSeat === null ? "—" : seatTitle(state.winnerSeat),
      finishedAt: state.finishedAt,
      turnCount: state.turnCount,
      note: history.find((entry) => entry.id === state.handId)?.note || "",
    });
  const roundOK = writeJson(browserStorage(), STORE, state),
    historyOK = writeJson(browserStorage(), HISTORY, history);
  status(
    roundOK && historyOK
      ? "Saved locally"
      : "Browser storage unavailable — playing in this tab.",
  );
}
function savePreferences() {
  status(
    writeJson(browserStorage(), PREFERENCES, preferences)
      ? "Settings saved locally"
      : "Browser storage unavailable — settings apply for this tab.",
  );
}
function applyPreferences() {
  document.documentElement.dataset.tileText = preferences.tileText;
  document.documentElement.dataset.motion = preferences.motion;
  $("#computer-speed").value = preferences.speed;
  $("#tile-text").value = preferences.tileText;
  $("#reduced-motion").value = preferences.motion;
}
function loadPreferences() {
  const loaded = readJson(browserStorage(), PREFERENCES);
  if (isValidPreferences(loaded.value)) preferences = loaded.value;
  else if (loaded.value !== null)
    notice = "Saved settings were invalid and were reset.";
  if (loaded.error)
    notice = "Browser storage unavailable — playing in this tab.";
  applyPreferences();
}
function cancelBot() {
  generation++;
  clearTimeout(botTimer);
  claimController.cancel();
}
function newGame(force = false) {
  if (
    !force &&
    state &&
    state.phase !== "ended" &&
    !confirm(
      "Start a new hand? The unfinished hand will be discarded and will not be added to history.",
    )
  )
    return;
  cancelBot();
  const wall = createWall(),
    players = Array.from({ length: 4 }, () => ({
      hand: [],
      melds: [],
      discards: [],
      discardHistory: [],
    }));
  for (let r = 0; r < 13; r++) for (const p of players) p.hand.push(wall.pop());
  players[0].hand.push(wall.pop());
  selectedHand = handFocusIndex = null;
  state = {
    handId: handId(),
    turnCount: 0,
    wall,
    players,
    turn: 0,
    phase: "discard",
    lastDiscard: null,
    lastDiscarder: null,
    turnStartedByDraw: true,
    message:
      "Your opening turn. Select a tile, then press Discard selected tile.",
    result: null,
    resultKind: null,
    winnerSeat: null,
  };
  focusTarget = "hand";
  commit();
}
function commit() {
  save();
  render();
  resume();
}
function load() {
  const saved = readJson(browserStorage(), STORE),
    savedHistory = readJson(browserStorage(), HISTORY);
  history = normalizeHistory(savedHistory.value);
  if (savedHistory.value !== null && !Array.isArray(savedHistory.value))
    notice = "Saved session history was invalid and was reset.";
  if (saved.error || savedHistory.error)
    notice = "Browser storage unavailable — playing in this tab.";
  if (isValidSavedRound(saved.value)) {
    state = saved.value;
    render();
    resume();
  } else {
    if (saved.value !== null)
      notice = "Saved hand was damaged or too old; a new hand has been dealt.";
    newGame(true);
  }
  if (notice) status(notice);
}
function hasUserClaim() {
  const c = claimChoices(state, 0);
  return c.ron || c.pon || c.chi.length;
}
function resume() {
  if (state.phase === "draw" && state.turn === 0) draw();
  else if (
    (state.phase === "draw" || state.phase === "discard") &&
    state.turn !== 0
  )
    scheduleBot();
  else if (
    state.phase === "claim" &&
    (state.lastDiscarder === 0 || !hasUserClaim())
  )
    scheduleSettlement();
}
function tileHtml(
  t,
  small = false,
  button = false,
  selected = false,
  index = null,
) {
  const d = tileInfo(t),
    cls = `tile ${small ? "mini-tile" : ""} ${tileClass(t)} ${selected ? "selected" : ""}`,
    body = `<span class="tile-rank">${d.honor ? tileShortLabel(t) : d.rank}</span><span class="tile-suit">${d.honor ? "honor" : { m: "char", p: "dots", s: "bamboo" }[d.suit]}</span>`;
  return button
    ? `<button class="${cls}" data-index="${index}" aria-label="${tileLabel(t)}${selected ? ", selected" : ""}" aria-pressed="${selected}">${body}</button>`
    : `<span class="${cls}" title="${tileLabel(t)}">${body}</span>`;
}
const melds = (m) =>
  m
    .map(
      (x) =>
        `<span class="meld">${x.map((t) => tileHtml(t, true)).join("")}</span>`,
    )
    .join("");
function historyHtml(p, seat) {
  const discarded = p.discardHistory ?? p.discards;
  return `<details class="discard-history" data-seat="${seat}"><summary>Discards (${discarded.length})</summary><div>${discarded.length ? discarded.map((t) => tileHtml(t, true)).join("") : "No discards yet."}</div></details>`;
}
function renderOpponent(i) {
  const p = state.players[i],
    el = $(`#seat-${i}`),
    active = state.turn === i && state.phase !== "ended";
  el.className = `opponent ${["", "south", "west", "north"][i]} ${active ? "active" : ""}`;
  el.innerHTML = `<div class="seat-heading"><i class="seat-dot"></i><span>${seatTitle(i)} · ${p.hand.length} concealed</span></div><div class="opponent-hand">${Array.from({ length: p.hand.length }, () => '<i class="back-tile"></i>').join("")}</div><div class="exposed">${melds(p.melds)}</div>${historyHtml(p, i)}`;
}
function renderPlayer() {
  const p = state.players[0],
    can = state.turn === 0 && state.phase === "discard",
    tiles = sortTiles(p.hand);
  selectedHand = selectedHandIndex(tiles.length, selectedHand);
  handFocusIndex = selectedHandIndex(tiles.length, handFocusIndex);
  $("#seat-0").innerHTML =
    `<div class="player-heading"><strong><i class="seat-dot"></i> You · East</strong><span>${p.hand.length} concealed</span></div><div class="exposed">${melds(p.melds)}</div><div class="hand" role="group" aria-label="Your hand; use arrow keys, Home and End to select a tile">${tiles.map((t, i) => tileHtml(t, false, can, selectedHand === i, i)).join("")}</div>${historyHtml(p, 0)}`;
  document.querySelectorAll(".hand button[data-index]").forEach(
    (b) =>
      (b.onclick = () => {
        selectedHand = handFocusIndex = Number(b.dataset.index);
        focusTarget = "hand";
        render();
      }),
  );
}
function renderHistory() {
  const shown =
      historyFilter === "all"
        ? history
        : history.filter(
            (entry) => entry.outcome.toLowerCase() === historyFilter,
          ),
    wins = history.filter((entry) => entry.outcome === "Win").length,
    draws = history.length - wins;
  $("#session-totals").textContent =
    `${history.length} completed · ${wins} wins · ${draws} draws`;
  $("#hand-history").innerHTML = shown.length
    ? shown
        .map(
          (entry) =>
            `<li><div><strong>${entry.outcome}</strong> · ${escapeHtml(entry.winner)}<br><small>${new Date(entry.finishedAt).toLocaleString()} · ${entry.turnCount} turns</small></div><label>Note <input data-note="${escapeHtml(entry.id)}" maxlength="280" value="${escapeHtml(entry.note)}" aria-label="Note for ${escapeHtml(entry.outcome)}"></label></li>`,
        )
        .join("")
    : "<li>No completed hands in this view.</li>";
  document.querySelectorAll("[data-note]").forEach(
    (input) =>
      (input.onchange = () => {
        history = history.map((entry) =>
          entry.id === input.dataset.note
            ? { ...entry, note: input.value }
            : entry,
        );
        status(
          writeJson(browserStorage(), HISTORY, history)
            ? "Note saved locally"
            : "Browser storage unavailable — note is only in this tab.",
        );
      }),
  );
}
function renderContext() {
  const active = document.activeElement,
    discard = active?.closest(".discard-history"),
    note = active?.matches("[data-note]") ? active : null;
  return {
    area: active?.closest(".settings")
      ? "settings"
      : discard
        ? "discard-history"
        : note
          ? "note"
          : "body",
    historySeat: discard?.dataset.seat,
    noteId: note?.dataset.note,
    noteValue: note?.value,
    noteStart: note?.selectionStart,
    noteEnd: note?.selectionEnd,
    openHistories: [...document.querySelectorAll(".discard-history[open]")].map(
      (el) => el.dataset.seat,
    ),
  };
}
function restoreFocus(context) {
  const target = focusTarget;
  focusTarget = null;
  context.openHistories.forEach((seat) =>
    document
      .querySelector(`.discard-history[data-seat="${seat}"]`)
      ?.setAttribute("open", ""),
  );
  if (!shouldRestoreHandFocus(context.area)) {
    if (context.area === "discard-history")
      requestAnimationFrame(() =>
        document
          .querySelector(
            `.discard-history[data-seat="${context.historySeat}"] summary`,
          )
          ?.focus(),
      );
    return;
  }
  if (context.area === "note")
    requestAnimationFrame(() => {
      const input = document.querySelector(
        `[data-note="${CSS.escape(context.noteId)}"]`,
      );
      if (input) {
        input.value = context.noteValue;
        input.focus();
        input.setSelectionRange(context.noteStart, context.noteEnd);
      }
    });
  else if (target === "hand")
    requestAnimationFrame(() => {
      const tile = document.querySelector(
        `.hand button[data-index="${handFocusIndex}"]`,
      );
      (tile || document.querySelector(".hand button"))?.focus();
    });
  else if (target === "claim")
    requestAnimationFrame(() => $("#claim-controls button")?.focus());
}
function render() {
  const context = renderContext();
  for (let i = 1; i < 4; i++) renderOpponent(i);
  renderPlayer();
  $("#round-label").textContent = state.result
    ? "HAND COMPLETE"
    : `EAST ROUND · ${state.phase === "claim" ? "CLAIM WINDOW" : seatTitle(state.turn).toUpperCase()}`;
  const last = $("#last-discard");
  last.className = `last-discard ${state.lastDiscard ? tileClass(state.lastDiscard) : "empty"}`;
  last.innerHTML = state.lastDiscard ? tileHtml(state.lastDiscard) : "—";
  $("#table-message").textContent = state.message;
  $("#wall-count").textContent = `${state.wall.length} tiles left in wall`;
  controls();
  renderHistory();
  restoreFocus(context);
}
function controls() {
  const claim = $("#claim-controls"),
    turn = $("#turn-controls");
  claim.innerHTML = turn.innerHTML = "";
  if (state.phase === "claim" && state.lastDiscarder !== 0) {
    const c = claimChoices(state, 0);
    if (c.ron || c.pon || c.chi.length) {
      claim.innerHTML =
        `<span class="control-copy">${c.ron ? "Ron ends the hand. " : ""}${c.pon ? "Pon makes a triple. " : ""}${c.chi.length ? "Chi makes a run for the next player. " : ""}</span>` +
        `<span class="control-copy">Claim ${tileLabel(state.lastDiscard)}?</span>${c.ron ? '<button class="action-button warn" data-claim="ron">Ron — win with this discard</button>' : ""}${c.pon ? '<button class="action-button" data-claim="pon">Pon — make a matching triple</button>' : ""}${c.chi.map((x, i) => `<button class="action-button" data-claim="chi" data-option="${i}">Chi — make a run with ${x.map(tileShortLabel).join(" ")}</button>`).join("")}<button class="action-button secondary" data-claim="pass">Pass — do not claim</button>`;
      claim
        .querySelectorAll("button")
        .forEach(
          (b) =>
            (b.onclick = () =>
              userClaim(b.dataset.claim, Number(b.dataset.option))),
        );
      focusTarget = "claim";
    }
  }
  if (state.phase === "ended")
    turn.innerHTML =
      '<button class="action-button" id="again">Deal a new hand</button>';
  else if (canSelfDraw(state, 0))
    turn.innerHTML =
      '<button class="action-button warn" id="tsumo">Self-draw win</button>';
  else if (state.turn !== 0 || state.phase === "draw")
    turn.innerHTML =
      '<span class="control-copy">Computer players are thinking…</span>';
  else
    turn.innerHTML = `<button id="discard-selected" class="action-button" ${selectedHand !== null ? "" : "disabled"}>Discard selected tile${selectedHand !== null ? `: ${tileLabel(sortTiles(state.players[0].hand)[selectedHand])}` : ""}</button><span class="control-copy">Select a tile, then discard it.</span>`;
  const discardButton = $("#discard-selected");
  if (discardButton)
    discardButton.onclick = () =>
      discard(0, sortTiles(state.players[0].hand)[selectedHand]);
  $("#again")?.addEventListener("click", () => newGame(true));
  $("#tsumo")?.addEventListener("click", () =>
    finish("You win by self-draw.", "win", 0),
  );
}
function finish(msg, kind = "win", winner = state.turn) {
  cancelBot();
  selectedHand = handFocusIndex = null;
  state.phase = "ended";
  state.result = state.message = msg;
  state.resultKind = kind;
  state.winnerSeat = winner;
  state.finishedAt ??= new Date().toISOString();
  commit();
}
function discard(seat, tile) {
  const next = discardTransition(state, seat, tile);
  if (!next) return;
  selectedHand = handFocusIndex = null;
  state = next;
  state.turnCount++;
  state.message = `${seatTitle(seat)} discarded ${tileLabel(tile)}. Checking claims…`;
  save();
  render();
  scheduleSettlement();
}
function settle(choice = null) {
  if (state.phase !== "claim") return;
  const outcome = settleClaims(state, choice),
    winningTile = state.lastDiscard;
  if (!outcome) return;
  const next = applySettlement(state, outcome);
  if (!next) return;
  state = next;
  if (state.phase === "ended") {
    state.message = `${seatTitle(outcome.seat)} wins by Ron on ${tileLabel(winningTile)}.`;
    state.result = state.message;
    state.resultKind = "win";
    state.winnerSeat = outcome.seat;
    state.finishedAt ??= new Date().toISOString();
  } else
    state.message =
      outcome.kind === "claim"
        ? `${seatTitle(outcome.seat)} claimed ${outcome.type}.`
        : `${seatTitle(state.turn)} draws a tile.`;
  focusTarget = state.turn === 0 ? "hand" : null;
  commit();
}
function userClaim(type, option) {
  settle(type === "pass" ? null : { type, option });
}
function draw() {
  const next = drawTransition(state);
  if (!next) return;
  state = next;
  if (state.phase === "ended")
    return finish(state.result, state.resultKind, state.winnerSeat);
  state.message =
    state.turn === 0
      ? "Your turn — select a tile, then discard it."
      : `${seatTitle(state.turn)} is choosing a discard.`;
  focusTarget = state.turn === 0 ? "hand" : null;
  commit();
}
function scheduleSettlement() {
  claimController.resume(speedDelay[preferences.speed]);
}
function scheduleBot() {
  const token = generation;
  clearTimeout(botTimer);
  botTimer = setTimeout(() => {
    if (token !== generation || state.turn === 0) return;
    if (state.phase === "draw") draw();
    else if (state.phase === "discard") {
      if (canSelfDraw(state, state.turn))
        finish(
          `${seatTitle(state.turn)} wins by self-draw.`,
          "win",
          state.turn,
        );
      else discard(state.turn, chooseDiscard(state.players[state.turn].hand));
    }
  }, speedDelay[preferences.speed]);
}
function handKeys(event) {
  if (
    !event.target.closest(".hand") ||
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
      "Enter",
      "Escape",
    ].includes(event.key) ||
    state.turn !== 0 ||
    state.phase !== "discard"
  )
    return;
  const tiles = sortTiles(state.players[0].hand),
    current = Number(event.target.dataset.index);
  if (event.key === "Escape") {
    selectedHand = null;
    handFocusIndex = current;
    focusTarget = "hand";
    event.preventDefault();
    render();
    return;
  }
  if (event.key === "Enter") {
    if (selectedHand !== null) discard(0, tiles[selectedHand]);
    event.preventDefault();
    return;
  }
  selectedHand = handFocusIndex = nextHandIndex(
    tiles.length,
    current,
    event.key,
  );
  focusTarget = "hand";
  event.preventDefault();
  render();
}
function downloadBackup() {
  const blob = new Blob(
      [JSON.stringify(createBackup(state, preferences, history), null, 2)],
      { type: "application/json" },
    ),
    url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `willow-table-backup-v${BACKUP_VERSION}.json`;
  link.click();
  URL.revokeObjectURL(url);
  status("Backup downloaded");
}
function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let backup;
    try {
      backup = validateBackup(JSON.parse(reader.result));
    } catch {}
    if (!backup) {
      status("Backup was invalid or unsupported; nothing was changed.");
      return;
    }
    if (
      !confirm(
        "Restore this backup? It will replace the current hand, settings, history, and notes.",
      )
    )
      return;
    cancelBot();
    state = backup.round;
    preferences = backup.preferences;
    history = backup.history;
    applyPreferences();
    const stored = [
      writeJson(browserStorage(), STORE, state),
      writeJson(browserStorage(), PREFERENCES, preferences),
      writeJson(browserStorage(), HISTORY, history),
    ].every(Boolean);
    status(
      stored
        ? "Backup restored locally"
        : "Backup restored for this tab, but browser storage is unavailable.",
    );
    render();
    resume();
  };
  reader.readAsText(file);
}
$("#new-game").onclick = () => newGame();
["computer-speed", "tile-text", "reduced-motion"].forEach(
  (id) =>
    ($("#" + id).onchange = (event) => {
      preferences[
        {
          "computer-speed": "speed",
          "tile-text": "tileText",
          "reduced-motion": "motion",
        }[id]
      ] = event.target.value;
      applyPreferences();
      savePreferences();
    }),
);
$("#history-filter").onchange = (event) => {
  historyFilter = event.target.value;
  renderHistory();
};
$("#export-backup").onclick = downloadBackup;
$("#restore-backup").onchange = (event) => {
  if (event.target.files[0]) restoreBackup(event.target.files[0]);
  event.target.value = "";
};
document.addEventListener("keydown", handKeys);
loadPreferences();
load();
