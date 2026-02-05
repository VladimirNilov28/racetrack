import socket from "./socket.js";

const elSessionLabel = document.querySelector(`[data-cd="session-info"] .pub-session-label`);
const elSessionId = document.querySelector(`[data-cd="session-info"] .pub-session-id`);
const elContent = document.querySelector(`[data-cd="content"]`);
const elConn = document.querySelector(`[data-cd="pub-status"]`);
const elFullscreen = document.getElementById("pub-fullscreen");

let state = null;

const EVENTS = Object.freeze({
  STATE_UPDATE: "evt:state:update",
});

function setConn(online) {
  if (!elConn) return;
  elConn.textContent = online ? "online" : "offline";
  elConn.classList.toggle("pub-conn-offline", !online);
  elConn.classList.toggle("pub-conn-online", online);
}

function getRemainingTime(s) {
  const t = s?.timer;
  if (!t || t.status !== "running") return null;
  if (typeof t.endsAt === "number") return t.endsAt - Date.now();
  return null;
}

function formatTimer(ms) {
  if (ms == null || ms < 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getDisplaySession(s) {
  const current = s?.sessions?.current;
  if (current) {
    return {session: current, label: "Current Race"};
  }
  return {session: null, label: null};
}

function renderCountdown() {
  if (!elContent) return;

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
            <p class="pub-idle-sub">Waiting a race to start...</p>
        </div>
    `;
    return;
  }

  const isCurrentRace = state?.sessions?.current != null;
  const remainingTime = isCurrentRace ? getRemainingTime(state) : null;
  const timerDisplay = remainingTime != null ? formatTimer(remainingTime) : "--:--";

  elContent.innerHTML = `
    <div class="countdown-display">
      <div class="countdown-timer">${timerDisplay}</div>
      <div class="countdown-label">Time Remaining</div>
    </div>
  `;
}

socket.on("connect", () => {
  setConn(true);
  renderCountdown();
});

socket.on("disconnect", () => {
  setConn(false);
  stopLocalTicker();  // Add this line
  renderCountdown();
});

let localTickerInterval = null;

function startLocalTicker() {
  stopLocalTicker();
  localTickerInterval = setInterval(renderCountdown, 250);
}

function stopLocalTicker() {
  if (localTickerInterval) {
    clearInterval(localTickerInterval);
    localTickerInterval = null;
  }
}

socket.connect();

socket.on(EVENTS.STATE_UPDATE, (snapshot) => {
  state = snapshot;
  renderCountdown();
  if (state?.timer?.status === "running") {
    startLocalTicker();
  } else {
    stopLocalTicker();
  }
});

elFullscreen?.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});