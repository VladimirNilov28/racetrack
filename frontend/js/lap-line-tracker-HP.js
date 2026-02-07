/**
 * Lap-line Tracker
 */

import socket from "./socket.js";

const EVENTS = Object.freeze({
  CMD: Object.freeze({
    LAP_RECORD: "cmd:lap:record",
  }),
  EVT: Object.freeze({
    STATE_UPDATE: "evt:state:update",
    CMD_REJECTED: "evt:cmd:rejected",
  }),
});

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);

const elConn = $('[data-llt="conn-status"]');
const elSessionId = $('[data-llt="session-id"]');
const elTimer = $('[data-llt="timer"]');
const elRaceMode = $('[data-llt="race-mode"]');
const elLastUpdate = $('[data-llt="last-update"]');
const elRecentLaps = $('[data-llt="recent-laps"]');

const carButtons = Array.from(document.querySelectorAll('[data-action="llt-record-lap"]'));

let state = null;
let recentLaps = [];
let timerIntervalId = null;

// ---------- helpers ----------
function setConn(online) {
  if (!elConn) return;
  elConn.textContent = online ? "Online" : "Offline";
  elConn.classList.toggle("badge_offline", !online);
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
function getCurrentSession(s) {
  return s?.sessions?.current ?? null;
}

function getModeValue(s) {
  return s?.race?.mode?.value ?? null;
}

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

function getDriverByCar(session, carNum) {
  if (!session?.drivers) return null;
  return session.drivers.find((d) => d.car === carNum) ?? null;
}

// ---------- render ----------
function render() {
  if (!state) {
    if (elSessionId) elSessionId.textContent = "—";
    if (elTimer) elTimer.textContent = "—:—";
    if (elRaceMode) elRaceMode.textContent = "—";
    renderCarButtons(null);
    return;
  }

  const current = getCurrentSession(state);
  const mode = getModeValue(state);

  // Session info
  if (elSessionId) elSessionId.textContent = current?.id ?? "No session";
  if (elTimer) elTimer.textContent = formatMMSS(getRemainingMs(state));
  if (elRaceMode) elRaceMode.textContent = mode ? String(mode).toUpperCase() : "—";

  // Car buttons
  renderCarButtons(current);

  // Recent laps
  renderRecentLaps();
}

function renderCarButtons(session) {
  carButtons.forEach((btn) => {
    const carNum = parseInt(btn.getAttribute("data-car"), 10);
    if (isNaN(carNum)) return;

    const driver = getDriverByCar(session, carNum);

    const elDriver = btn.querySelector(`[data-llt="car-${carNum}-driver"]`);
    const elLaps = btn.querySelector(`[data-llt="car-${carNum}-laps"]`);

    if (elDriver) {
      elDriver.textContent = driver?.name ?? "—";
    }

    if (elLaps) {
      const laps = driver?.laps ?? 0;
      elLaps.textContent = `${laps} ${laps === 1 ? "lap" : "laps"}`;
    }

    // Disable button if no driver assigned or no session
    btn.disabled = !driver || !session;
  });
}

function renderRecentLaps() {
  if (!elRecentLaps) return;

  if (recentLaps.length === 0) {
    elRecentLaps.innerHTML = '<li class="muted">No laps recorded yet</li>';
    return;
  }

  // Show last 10 laps
  const html = recentLaps
    .slice(-10)
    .reverse()
    .map((lap) => {
      return `<li>Car ${lap.car} • ${lap.driver || "Unknown"} • ${lap.time}</li>`;
    })
    .join("");

  elRecentLaps.innerHTML = html;
}

// ---------- actions -> commands ----------

// SOCKET: cmd:lap:record — Records a lap for a car
carButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const carNum = parseInt(btn.getAttribute("data-car"), 10);
    if (isNaN(carNum)) return;

    socket.emit(EVENTS.CMD.LAP_RECORD, { car: carNum });

    // Add to recent laps 
    const session = getCurrentSession(state);
    const driver = getDriverByCar(session, carNum);
    recentLaps.push({
      car: carNum,
      driver: driver?.name ?? "Unknown",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    });

    // Visual
    btn.style.transform = "scale(0.95)";
    setTimeout(() => {
      btn.style.transform = "";
    }, 100);

    renderRecentLaps();
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
  render();
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
