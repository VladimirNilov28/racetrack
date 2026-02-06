import socket from "./socket.js";
import {setConn, escapeHtml, setupFullscreenToggle} from "./helpers/dom-helpers.js";
import {
  getRemainingTime,
  formatSessionTimer,
  createLocalTicker,
  formatLapTime,
} from "./helpers/timer-helpers.js";
import {EVENTS} from "./helpers/constants.js";

const elSessionLabel = document.querySelector(`[data-lb="session-info"] .pub-session-label`);
const elSessionId = document.querySelector(`[data-lb="session-info"] .pub-session-id`);
const elTimerDisplay = document.querySelector(`[data-lb="timer-display"] .pub-flag-timer`);
const elFlagMode = document.querySelector(`[data-lb="flag-mode"]`);
const elContent = document.querySelector(`[data-lb="content"]`);
const elConn = document.querySelector(`[data-lb="pub-status"]`);
const elFullscreen = document.getElementById("pub-fullscreen");

let state = null;

// render content according to state (null || currentRace || lastResult)
function getLeaderboardSessions(s) {
  const current = s?.sessions?.current;
  const lastResult = s?.sessions?.lastResult;

  if (current) {
    return {session: current, label: "Current Race"};
  }

  if (lastResult) {
    return {session: lastResult, label: "Previous Race Results"};
  }

  return {session: null, label: null};
}

function getLeaderboard(session) {
  if (!session?.drivers) return [];

  return [...session.drivers].sort((a, b) => {
    const aHasLap = a.fastestLap != null;
    const bHasLap = b.fastestLap != null;

    // both have laps: sort by fastest time, ascending
    if (aHasLap && bHasLap) {
      return a.fastestLap - b.fastestLap;
    }

    // driver with finished laps: move to the top
    if (aHasLap && !bHasLap) return -1;
    if (!aHasLap && bHasLap) return 1;

    // both have no laps: sort by car nr, ascending
    return (a.car ?? 0) - (b.car ?? 0);
  });
}

// main render function
function renderLeaderboard() {
  if (!elContent) return;

  const isCurrentRace = state?.sessions?.current != null;
  const remainingTime = isCurrentRace ? getRemainingTime(state) : null;
  const remainingTimer = remainingTime != null ? formatSessionTimer(remainingTime) : "--:--";

  if (elTimerDisplay) {
    const elTimerValue = elTimerDisplay.querySelector(".pub-timer-value");
    if (elTimerValue) {
      elTimerValue.textContent = remainingTimer;
    }
    elTimerDisplay.classList.toggle("pub-flag-hidden", !isCurrentRace);
  }

  const raceMode = state?.race?.mode?.value ?? "danger";
  if (elFlagMode) {
    elFlagMode.textContent = raceMode.toUpperCase();
    elFlagMode.setAttribute("data-mode", raceMode);
  }

  const {session, label} = getLeaderboardSessions(state);
  if (elSessionLabel && elSessionId) {
    if (session) {
      elSessionLabel.textContent = `${label}:`;
      elSessionId.textContent = session.id ?? "---";
    } else {
      elSessionLabel.textContent = "";
      elSessionId.textContent = "";
    }
  }

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

  if (!session) {
    elContent.innerHTML = `
        <div class="pub-idle">
            <p class="pub-idle-icon">🙈</p>
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
      const rowClass = "pub-driver";

      // leaderboard data rows
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

    // leaderboard header row
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

// socket.connect();
const localTicker = createLocalTicker(renderLeaderboard);

// sockets events
socket.on("connect", () => {
  setConn(elConn, true);
  renderLeaderboard();
});

socket.on("disconnect", () => {
  setConn(elConn, false);
  localTicker.stop();  // Add this line
  renderLeaderboard();
});


socket.on(EVENTS.STATE_UPDATE, (snapshot) => {
  console.log("Drivers:", snapshot?.sessions?.current?.drivers?.map(d => ({ // DEBUG
    car: d.car,
    laps: d.laps,
    fastestLap: d.fastestLap,
  })));
  state = snapshot;
  renderLeaderboard();
  if (state?.timer?.status === "running") {
    localTicker.start();
  } else {
    localTicker.stop();
  }
});

setupFullscreenToggle(elFullscreen);

// DEBUG: exposing socket globally for emulating lap-line-tracker, very noice.
if (typeof window !== "undefined") {
  window.debugSocket = socket;
  Object.defineProperty(window, "state", {get: () => state});
}

renderLeaderboard();