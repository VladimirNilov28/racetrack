import socket from "./socket.js";
import {setConn, setupFullscreenToggle} from "./helpers/dom-helpers.js";
import { getRemainingTime, formatSessionTimer, createLocalTicker } from "./helpers/timer-helpers.js";
import {EVENTS} from "./helpers/constants.js";

const elSessionLabel = document.querySelector(`[data-cd="session-info"] .pub-session-label`);
const elSessionId = document.querySelector(`[data-cd="session-info"] .pub-session-id`);
const elContent = document.querySelector(`[data-cd="content"]`);
const elConn = document.querySelector(`[data-cd="pub-status"]`);
const elFullscreen = document.getElementById("pub-fullscreen");

let state = null;

function getDisplaySession(s) {
  const current = s?.sessions?.current;
  if (current) {
    return {session: current, label: "Current Race"};
  }
  return {session: null, label: null};
}

const localTicker = createLocalTicker(renderCountdown);

// main render function
function renderCountdown() {
  if (!elContent) return;

  const {session, label} = getDisplaySession(state);

  if (elSessionLabel && elSessionId) {
    if (session) {
      elSessionLabel.textContent = `${label}:`;
      elSessionId.textContent = session.id ?? "---";
    } else {
      elSessionLabel.textContent = "No Active Race";
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
            <p class="pub-idle-text">Please wait...</p>
            <p class="pub-idle-sub">Waiting for a race to start...</p>
        </div>
    `;
    return;
  }

  const isCurrentRace = state?.sessions?.current != null;
  const remainingTime = isCurrentRace ? getRemainingTime(state) : null;
  const timerDisplay = remainingTime != null ? formatSessionTimer(remainingTime) : "--:--";

  elContent.innerHTML = `
    <div class="countdown-display">
      <div class="countdown-timer">${timerDisplay}</div>
      <div class="countdown-label">Time Remaining</div>
    </div>
  `;
}

socket.on("connect", () => {
  setConn(elConn, true);
  renderCountdown();
});

socket.on("disconnect", () => {
  setConn(elConn, false);
  localTicker.stop();
  renderCountdown();
});

// socket.connect();

socket.on(EVENTS.STATE_UPDATE, (snapshot) => {
  state = snapshot;
  renderCountdown();
  if (state?.timer?.status === "running") {
    localTicker.start();
  } else {
    localTicker.stop();
  }
});

// DEBUG: exposing socket globally for emulating lap-line-tracker, very noice.
if (typeof window !== "undefined") {
  window.debugSocket = socket;
  Object.defineProperty(window, "state", {get: () => state});
}

setupFullscreenToggle(elFullscreen);