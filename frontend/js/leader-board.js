import socket from "./socket.js";

const elContent = document.querySelector(`[data-lb="content"]`);
const elConn = document.querySelector(`[data-nr="conn-status"]`);
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

    // both have laps: sort by fastest time, acending
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

  if (!socket.connected) {
    elContent.innerHTML = `
      <div class="nr-error">
        <p class="nr-error-icon">⚠️</p>
        <p class="nr-error-text">Connection lost</p>
        <p class="nr-error-sub">Attempting to reconnect...</p>
      </div>
    `;
    return;
  }

  const {session, label} = getDisplaySession(state);

  // no current/prev session
  if (!session) {
    elContent.innerHTML = `
        <div class="nr-idle">
            <p class="nr-idle-icon">🏁</p>
            <p class="nr-idle-text">No races yet</p>
            <p class="nr-idle-sub">Waiting for first race to start...</p>
        </div>
    `;
    return;
  }

  const leaderboard = getLeaderboard(session);
  const sessionId = session.id ?? "B===D";
  const raceMode = state?.race?.mode?.value ?? "safe";
  const isCurrentRace = state?.sessions?.current != null;

  // ?? current race timer // fix MS
  const remainingTime = isCurrentRace ? getRemainingTime(state) : 0;
  const remainingTimer = remainingTime != null ? formatTimer(remainingTime) : "--:--";

  // sess hdr: always
  let sessionHtml = `
    <li class="nr-session">
      <span class="nr-session-label">${escapeHtml(label)}:</span>
      <span class="nr-session-id">${escapeHtml(sessionId)}</span>
    </li>
  `;

  // rem. timer row: only for current race
  if (isCurrentRace) {
    sessionHtml += `
      <li class="nr-timer">
        <span>Time Remaining:</span>
        <span class="nr-timer-value">${remainingTimer}</span>
      </li>
    `;
  }

  // race flag mode indic8or: always
  sessionHtml += `
    <li class="nr-mode nr-mode-${escapeHtml(raceMode)}">
      <span>Race Flag Mode:</span>
      <span>${escapeHtml(raceMode.toUpperCase())}</span>
    </li>
  `;

  // old lb-sorter, will be deleted
  /* leaderboard.sort((a, b) => {
      if (a.fastestLap == null) return 1;
      if (b.fastestLap == null) return -1;
      return a.fastestLap - b.fastestLap;
    }); */

  // leaderboard
  let leaderboardHtml;
  if (leaderboard.length === 0) {
    leaderboardHtml = `<li>No active leaderboard... Yet.</li>`;
  } else {
    leaderboardHtml = leaderboard
    .map((t, index) => {
      const position = index + 1;
      const positionClass = position === 1 ? "nr-position-1st" : "";

      return `
        <li class="nr-driver ${positionClass}">
          <span class="nr-position">${position}</span>
          <span class="nr-car">Car ${escapeHtml(t.car ?? "?")}</span>
          <span class="nr-name">${escapeHtml(t.name ?? "Unknown")}</span>
          <span>Fastest: ${formatLapTime(t.fastestLap)}</span>
          <span>Laps: ${escapeHtml(t.laps ?? 0)}</span>
        </li>
      `;
    })
    .join("");
  }

  elContent.innerHTML = `
    ${sessionHtml}
    <ul class="nr-drivers">${leaderboardHtml}</ul>
  `;
}

// sockets events
socket.on("connect", () => {
  setConn(true);
  renderLeaderboard();
});

socket.on('disconnect', () => {
  setConn(false);
  stopLocalTicker();  // Add this line
  renderLeaderboard();
});

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

// DEBUG
// socket.on("connect", () => console.log("Connected:", socket.id));
// socket.on("connect_error", (err) => console.error("Connection error:", err));

// main event
socket.on(EVENTS.STATE_UPDATE, (snapshot) => {
  console.log("State received:", JSON.stringify(snapshot, null, 2));
  state = snapshot;
  renderLeaderboard();

  if (state?.timer?.status === 'running') {
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

// DEBUG: exposing socket globally for emulating lap-line-tracker
if (typeof window !== "undefined") {
  window.debugSocket = socket;
  Object.defineProperty(window, "state", {get: () => state});
}

renderLeaderboard();