import socket from "./socket.js";

const elSessionLabel = document.querySelector(`[data-lb="session-info"] .pub-session-label`);
const elSessionId = document.querySelector(`[data-lb="session-info"] .pub-session-id`);
const elTimerDisplay = document.querySelector(`[data-lb="timer-display"] .pub-flag-timer`);
const elFlagMode = document.querySelector(`[data-lb="flag-mode"]`);
const elContent = document.querySelector(`[data-lb="content"]`);
const elConn = document.querySelector(`[data-lb="pub-status"]`);
const elFullscreen = document.getElementById("pub-fullscreen");

let state = null;

const EVENTS = Object.freeze({
  STATE_UPDATE: "evt:state:update",
});

/* helper functions */
function setConn(online) {
  if (!elConn) return;
  elConn.textContent = online ? "online" : "offline";
  elConn.classList.toggle("pub-conn-offline", !online);
  elConn.classList.toggle("pub-conn-online", online);
}

function escapeHtml(str) {
  return String(str).
    replace(/&/g, "&amp;").
    replace(/</g, "&lt;").
    replace(/>/g, "&gt;").
    replace(/"/g, "&quot;").
    replace(/'/g, "&#39;");
}

// render content according to state (null || currentRace || lastResult)
function getDisplaySession(s) {
  const current = s?.sessions?.current;
  const lastResult = s?.sessions?.lastResult;

  if (current) {
    return {session: current, label: "Current Race Leaderboard"};
  }

  if (lastResult) {
    return {session: lastResult, label: "Previous Race Results"};
  }

  return {session: null, label: null};
}

function getLeaderboard(session) {
  if (!session?.drivers) return [];

  // new sorting algo, trying to get lapless drivers displayed in leaderboard
  return [...session.drivers].sort((a, b) => {
    // define some new vars
    const aHasLap = a.fastestLap != null;
    const bHasLap = b.fastestLap != null;

    // both have laps: sort by fastest time, ascending
    if (aHasLap && bHasLap) {
      return a.fastestLap - b.fastestLap;
    }

    // only one has laps: that one comes first, moved on top
    if (aHasLap && !bHasLap) return -1;
    if (!aHasLap && bHasLap) return 1;

    // both have no laps: sort by car nr, ascending
    return (a.car ?? 0) - (b.car ?? 0);
  });
}

// 1. get remaining sess time and 2. format ms to mm:ss
function getRemainingTime(s) {
  const t = s?.timer;
  if (!t || t.status !== "running") return null;
  if (typeof t.endsAt === "number") return t.endsAt - Date.now();
  return null;
}

function formatTimer(ms) {
  if (ms == null || ms < 0) return "";
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// format ms to mm:ss.mss for lap times
function formatLapTime(ms) {
  if (ms == null) return "--:--.---";
  const totalMs = Math.floor(ms);
  const mins = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${mins}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

// main render function
function renderLeaderboard() {
  if (!elContent) return;

  // first, get relevant data and start assembling the header
  const isCurrentRace = state?.sessions?.current != null;
  const remainingTime = isCurrentRace ? getRemainingTime(state) : null;
  const remainingTimer = remainingTime != null ? formatTimer(remainingTime) : "--:--";

  if (elTimerDisplay) {
    elTimerDisplay.textContent = remainingTimer;
    elTimerDisplay.classList.toggle("pub-flag-hidden", !isCurrentRace);
  }

  const raceMode = state?.race?.mode?.value ?? "safe";
  if (elFlagMode) {
    elFlagMode.textContent = raceMode.toUpperCase();
    elFlagMode.setAttribute("data-mode", raceMode);
  }

  const {session, label} = getDisplaySession(state);
  if (elSessionLabel && elSessionId) {
    if (session) {
      elSessionLabel.textContent = `${label}:`;
      elSessionId.textContent = session.id ?? "---";
    } else {
      elSessionLabel.textContent = "No Active Race";
      elSessionId.textContent = "---";
    }
  }

  // second, check connection state and render content area
  // no connection:
  if (!socket.connected) {
    elContent.innerHTML = `
      <div class="pub-error">
        <p class="pub-error-icon">⚠️</p>
        <p class="pub-error-text">Connection lost</p>
        <p class="pub-error-sub">Attempting to reconnect...</p>
      </div>
    `;
    return;
  }

  // no current/prev session:
  if (!session) {
    elContent.innerHTML = `
        <div class="pub-idle">
            <p class="pub-idle-icon">🏁</p>
            <p class="pub-idle-text">No races yet</p>
            <p class="pub-idle-sub">Waiting for first race to start...</p>
        </div>
    `;
    return;
  }

  const leaderboard = getLeaderboard(session);

  let leaderboardHtml;
  if (leaderboard.length === 0) {
    leaderboardHtml = `
      <div class="pub-drivers-list-empty">No active leaderboard... Yet.</div>
    `;
  } else {
    const rows = leaderboard.map((t, index) => {
      const hasLap = t.fastestLap != null;
      const position = hasLap ? index + 1 : null;

      // mmm, medals...
      let medalHtml = "";
      if (hasLap && position === 1) medalHtml = `<span class=pub-medal-gold>🥇</span>`;
      else if (hasLap && position === 2) medalHtml = `<span class=pub-medal-silver>🥈</span>`;
      else if (hasLap && position === 3) medalHtml = `<span class=pub-medal-bronze>🥉</span>`;

      // position display
      const posDisplay = hasLap ? position : "-";
      const posClass = hasLap ? "" : "pub-position-none";
      const rowClass = "pub-driver"; // row formatting

      return `
        <tr class="${rowClass}">
          <td class="pub-col-medal">${medalHtml}</td>
          <td class="pub-col-pos ${posClass}">${posDisplay}</td>
          <td class="pub-col-car"><span class="pub-car">CAR ${escapeHtml(t.car ?? "?")}</span></td>
          <td class="pub-col-name">${escapeHtml(t.name ?? "Unknown")}</td>
          <td class="pub-col-fastest">${formatLapTime(t.fastestLap)}</td>
          <td class="pub-col-laps">${escapeHtml(t.laps ?? 0)}</td>
        </tr>
      `;
    }).join("");

    // leaderboard column row
    leaderboardHtml = `
    <table class="pub-drivers-list">
      <thead>
        <tr class="pub-drivers-list-header">
          <th class="pub-col-medal">🏆</th>
          <th class="pub-col-pos">Pos</th>
          <th class="pub-col-car">Car #</th>
          <th class="pub-col-name">Driver</th>
          <th class="pub-col-fastest">Best Lap</th>
          <th class="pub-col-laps">Laps</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
  }

  elContent.innerHTML = leaderboardHtml;
}

// sockets events
socket.on("connect", () => {
  setConn(true);
  renderLeaderboard();
});

socket.on("disconnect", () => {
  setConn(false);
  stopLocalTicker();  // Add this line
  renderLeaderboard();
});

// local countdown ticker helpers
let localTickerInterval = null;

function startLocalTicker() {
  stopLocalTicker();
  localTickerInterval = setInterval(renderLeaderboard, 250);
}

function stopLocalTicker() {
  if (localTickerInterval) {
    clearInterval(localTickerInterval);
    localTickerInterval = null;
  }
}

// main event
socket.on(EVENTS.STATE_UPDATE, (snapshot) => {
  console.log("Drivers:", snapshot?.sessions?.current?.drivers?.map(d => ({ // DEBUG
    car: d.car,
    laps: d.laps,
    fastestLap: d.fastestLap,
  })));

  state = snapshot;
  renderLeaderboard();

  if (state?.timer?.status === "running") {
    startLocalTicker();
  } else {
    stopLocalTicker();
  }
});

// fullscreen toggle v1
elFullscreen?.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// DEBUG: exposing socket globally for emulating lap-line-tracker, very noice.
if (typeof window !== "undefined") {
  window.debugSocket = socket;
  Object.defineProperty(window, "state", {get: () => state});
}

renderLeaderboard();