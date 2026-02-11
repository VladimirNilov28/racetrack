/**
 * Race Control 
 */

import socket from "./socket.js";

const EVENTS = Object.freeze({
  CMD: Object.freeze({
    RACE_START: "cmd:race:start",
    RACE_SET_MODE: "cmd:race:set-mode",
    RACE_FINISH: "cmd:race:finish",
    SESSION_END: "cmd:session:end",
  }),
  EVT: Object.freeze({
    STATE_UPDATE: "evt:state:update",
    CMD_REJECTED: "evt:cmd:rejected",
  }),
});

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);

const elConn = $('[data-rc="conn-status"]');
const elCurrentSession = $('[data-rc="current-session"]');
const elNextSession = $('[data-rc="next-session"]');
const elTimer = $('[data-rc="timer"]');
const elCurrentMode = $('[data-rc="current-mode"]');
const elLastUpdate = $('[data-rc="last-update"]');
const elMsg = $('[data-rc="msg"]');

const btnStart = document.querySelector('[data-action="rc-start"]');
const btnFinish = document.querySelector('[data-action="rc-finish"]');
const btnEndSession = document.querySelector('[data-action="rc-end-session"]');
const btnSync = document.querySelector('[data-action="rc-sync"]');
const modeButtons = Array.from(document.querySelectorAll('[data-action="rc-set-mode"]'));

let state = null;
let timerIntervalId = null;

// ---------- helpers ----------
function setConn(online) {
  if (!elConn) return;
  elConn.textContent = online ? "Online" : "Offline";
  elConn.classList.toggle("badge_offline", !online);
}

function setMsg(text = "", kind = "") {
  if (!elMsg) return;
  elMsg.textContent = text;
  elMsg.classList.remove("is-error", "is-info");
  if (kind) elMsg.classList.add(kind);
}

function setLastUpdateNow() {
  if (!elLastUpdate) return;
  elLastUpdate.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMMSS(ms) {
  if (ms == null || Number.isNaN(ms)) return "—:—";
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------- getters ----------
function getModeValue(s) {
  return s?.race?.mode?.value ?? null;
}

function getCurrentSession(s) {
  return s?.sessions?.current ?? null;
}

function getUpcomingSessions(s) {
  return s?.sessions?.upcoming ?? [];
}

function sessionLabel(sess) {
  if (!sess) return "—";
  return sess.id ?? "Session";
}

/**
 * Timer 
 */
function getRemainingMs(s) {
  const t = s?.timer;
  if (!t) return null;

  if (typeof t.remainingMs === "number") return t.remainingMs;

  const now = Date.now();

  if (typeof t.endsAt === "number") return t.endsAt - now;
  if (typeof t.endAt === "number") return t.endAt - now;

  if (typeof t.startedAt === "number" && typeof t.durationSec === "number") {
    return t.startedAt + t.durationSec * 1000 - now;
  }

  return null;
}

// ---------- render ----------
function render() {
  if (!state) {
    if (elCurrentSession) elCurrentSession.textContent = "—";
    if (elNextSession) elNextSession.textContent = "—";
    if (elTimer) elTimer.textContent = "—:—";
    if (elCurrentMode) elCurrentMode.textContent = "—";
    return;
  }

  const current = getCurrentSession(state);
  const next = getUpcomingSessions(state)[0] ?? null;

  if (elCurrentSession) elCurrentSession.textContent = sessionLabel(current);
  if (elNextSession) elNextSession.textContent = sessionLabel(next);

  if (elTimer) elTimer.textContent = formatMMSS(getRemainingMs(state));

  const mode = getModeValue(state);
  if (elCurrentMode) elCurrentMode.textContent = mode ? String(mode).toUpperCase() : "—";

  // highlight active mode button
  modeButtons.forEach((btn) => {
    const m = btn.getAttribute("data-mode");
    btn.classList.toggle("is-active", !!mode && !!m && String(mode).toLowerCase() === m);
  });

  // UX rule: once finish, disable mode buttons
  const isFinish = String(mode).toLowerCase() === "finish";
  modeButtons.forEach((btn) => {
    btn.disabled = isFinish;
    if (isFinish) {
      btn.setAttribute("aria-disabled", "true");
    } else {
      btn.removeAttribute("aria-disabled");
    }
  });
}

// ---------- actions -> commands ----------

// SOCKET: cmd:race:start — Starts race
btnStart?.addEventListener("click", () => {
  setMsg("");
  socket.emit(EVENTS.CMD.RACE_START, {});
});

// SOCKET: cmd:race:finish — Finishes the race 
btnFinish?.addEventListener("click", () => {
  setMsg("");
  socket.emit(EVENTS.CMD.RACE_FINISH, {});
});

// SOCKET: cmd:session:end — Ends current session 
btnEndSession?.addEventListener("click", () => {
  setMsg("");
  socket.emit(EVENTS.CMD.SESSION_END, {});
});

btnSync?.addEventListener("click", () => {
  setMsg("Waiting for state update…", "is-info");
});

// SOCKET: cmd:race:set-mode — Sets race flag 
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setMsg("");
    const mode = btn.getAttribute("data-mode");
    if (!mode) return;
    socket.emit(EVENTS.CMD.RACE_SET_MODE, { mode });
  });
});

// ---------- socket -> UI ----------

socket.on("connect", () => {
  setConn(true);
  setLastUpdateNow();
  startTimerTick();
});

socket.on("disconnect", () => {
  setConn(false);
  stopTimerTick();
});

socket.on(EVENTS.EVT.STATE_UPDATE, (snapshot) => {
  state = snapshot;
  setLastUpdateNow();
  setMsg("");
  render();
});

socket.on(EVENTS.EVT.CMD_REJECTED, ({ reason, event } = {}) => {
  setMsg(reason || `Command rejected: ${event || "unknown"}`, "is-error");
});

// ---------- timer tick ----------
function startTimerTick() {
  if (timerIntervalId) return;
  timerIntervalId = setInterval(() => {
    if (elTimer && state) {
      elTimer.textContent = formatMMSS(getRemainingMs(state));
    }
  }, 100);
}

function stopTimerTick() {
  if (timerIntervalId) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
}

// Initial paint
render();
startTimerTick();
