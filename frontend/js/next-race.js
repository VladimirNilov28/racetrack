import socket from "./socket.js";
import { setConn, escapeHtml, setupFullscreenToggle } from "./helpers/dom-helpers.js";
// import { getRemainingTime, formatTimer, createLocalTicker } from "./helpers/timer-helpers.js";
import {EVENTS} from "./helpers/constants.js";

const elSessionLabel = document.querySelector(`[data-nr="session-info"] .pub-session-label`);
const elSessionId = document.querySelector(`[data-nr="session-info"] .pub-session-id`);
const elContent = document.querySelector(`[data-nr="content"]`);
const elConn = document.querySelector(`[data-nr="pub-status"]`);
const elFullscreen = document.getElementById("pub-fullscreen");

let state = null;

function getUpcomingSession(s) {
  const upcoming = s?.sessions?.upcoming;

  if (Array.isArray(upcoming) && upcoming.length > 0) {
    return {session: upcoming[0], label: "Upcoming session"};
  }
  return {session: null, label: null};
}

function getUpcomingDrivers(upcoming) {
  if (!upcoming?.drivers) return [];
  return [...upcoming.drivers].sort((a, b) => a.car - b.car);
}

// MAIN RENDER FUNCTION
function renderNextRace() {
  if (!elContent) return;

  const {session, label} = getUpcomingSession(state);
  if (elSessionLabel && elSessionId) {
    if (session) {
      elSessionLabel.textContent = `${label}:`;
      elSessionId.textContent = session.id != null ? String(session.id) : "___";
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
                <p class="pub-idle-text">No upcoming races</p>
                <p class="pub-idle-sub">Please wait...</p>
            </div>
        `;
    return;
  }

  const drivers = getUpcomingDrivers(session);

  let nextRaceHtml;
  if (drivers.length === 0) {
    nextRaceHtml = `<div class="pub-drivers-list-empty">No racer data... Yet.</div>`;
  } else {
    const rows = drivers.map((d) => {
      const rowClass = "pub-driver";

      return `
      <tr class="${rowClass}">
          <td class="pub-col-car"><span class="pub-car">CAR ${escapeHtml(d.car ?? "?")}</span></td>
          <td class="pub-col-name">${escapeHtml(d.name ?? "Unknown")}</td>
      </tr>
    `;
    }).join("");

    nextRaceHtml = `
    <table class="pub-drivers-list">
        <thead>
            <tr class="pub-drivers-list-header">
                <th class="pub-col-car">Car #</th>
                <th class="pub-col-name">Driver</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
    `;
  }
  elContent.innerHTML = nextRaceHtml;
}

socket.on("connect", () => {
  setConn(elConn, true);
  renderNextRace();
});

socket.on("disconnect", () => {
  setConn(elConn, false);
  renderNextRace();
});

socket.on(EVENTS.STATE_UPDATE, (snapshot) => {
  // DEBUG: next line is for debugging purposes only:
  console.log("State received: ", JSON.stringify(snapshot, null, 2));
  state = snapshot;
  renderNextRace();
});

setupFullscreenToggle(elFullscreen);

// DEBUG: exposing socket globally for emulating lap-line-tracker, front-desk etc.
if (typeof window !== "undefined") {
  window.debugSocket = socket;
  Object.defineProperty(window, "state", {get: () => state});
}

renderNextRace();