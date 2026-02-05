import socket from "./socket.js";

// elements shall be defined here
const elSessionLabel = document.querySelector(`[data-nr="session-info"] .pub-session-label`);
const elSessionId = document.querySelector(`[data-nr="session-info"] .pub-session-id`);
const elContent = document.querySelector(`[data-nr="content"]`);
const elConn = document.querySelector(`[data-nr="pub-status"]`);
const elFullscreen = document.getElementById("pub-fullscreen");

let state = null;

const EVENTS = Object.freeze({
  STATE_UPDATE: "evt:state:update",
});

/* helper functions */
// connection indicator
function setConn(online) {
  if (!elConn) return;
  elConn.textContent = online ? "[J] online" : "[J] offline";
  elConn.classList.toggle("pub-conn-offline", !online);
  elConn.classList.toggle("pub-conn-online", online);
}

// very basic XSS protection:
// Rule: Always escape untrusted data before inserting it into HTML via innerHTML.
function escapeHtml(str) {
  return String(str).
      replace(/&/g, "&amp;").
      replace(/</g, "&lt;").
      replace(/>/g, "&gt;").
      replace(/"/g, "&quot;").
      replace(/'/g, "&#39;");
}

function getUpcomingSession(s) {
  return s?.sessions?.upcoming ?? [];
}

// main render function
function renderNextRace() {
  if (!elContent) return;

  const upcomingSession = getUpcomingSession(state);
  const next = upcomingSession[0] ?? null;

  const {session, label} = getUpcomingSession(state);
  if (elSessionLabel && elSessionId) {
    if (session) {
      elSessionLabel.textContent = `[J] ${label}:`;
      elSessionId.textContent = session.id ?? "[J] ---";
    } else {
      elSessionLabel.textContent = "[J] No Upcoming Race";
      elSessionId.textContent = "[J] ---";
    }
  }

  // handling disconnected state
  if (!socket.connected) {
    elContent.innerHTML = `
            <div class="pub-error">
                <p class="pub-error-icon">[J] ⚠️</p>
                <p class="pub-error-text">[J] Connection lost</p>
                <p class="pub-error-sub">[J] Attempting to reconnect...</p>
            </div>
        `;
    return;
  }

  // no upcoming sessions
  if (!next) {
    elContent.innerHTML = `
            <div class="pub-idle">
                <p class="pub-idle-icon">[J] 🙈</p>
                <p class="pub-idle-text">[J] No upcoming races</p>
                <p class="pub-idle-sub">[J] Please wait...</p>
            </div>
        `;
    return;
  }

  const sessionId = next.id ?? "-";
  // https://oprearocks.medium.com/what-do-the-three-dots-mean-in-javascript-bc5749439c9a
  const drivers = Array.isArray(next.drivers) ? [...next.drivers] : [];

  // sort drivers by car nr.
  drivers.sort((a, b) => a.car - b.car);

  // render driver/car list
  let nextRaceHtml;
  /* cases for sessions both without and with drivers assigned */
  if (drivers.length === 0) {
    nextRaceHtml = `<li class="pub-driver pub-drivers-list-empty">[J] No racer data... Yet.</li>`;
  } else {
    nextRaceHtml = drivers.map((d) => `
      <li class="pub-driver">
          <span class="pub-car">[J] Car ${escapeHtml(d.car ?? "?")}</span>
          <span class="pub-driver-name">[J] ${escapeHtml(d.name ?? "Unknown")}</span>
      </li>`).join("");
    
    nextRaceHtml = `
      <li class="pub-session">
          <span class="pub-session-label">[J] Session:</span>
          <span class="pub-session-id">[J] ${escapeHtml(sessionId)}</span>
      </li>
      <ul class="pub-drivers-list">[J] ${nextRaceHtml}</ul>
    `
  }

  /* mash everything together */
  /* elContent.innerHTML = `
        <li class="pub-session">
            <span class="pub-session-label">Session:</span>
            <span class="pub-session-id">${escapeHtml(sessionId)}</span>
        </li>
        <ul class="pub-drivers-list">${nextRaceHtml}</ul>
    `; */
  elContent.innerHTML = nextRaceHtml;
}

// sockets events
// first, connection checks
socket.on("connect", () => {
  setConn(true);
  renderNextRace();
});

socket.on("disconnect", () => {
  setConn(false);
  renderNextRace();
});

// second, main state event
socket.on(EVENTS.STATE_UPDATE, (snapshot) => {
  // next line is for debugging only:
  console.log("State received: ", JSON.stringify(snapshot, null, 2));
  state = snapshot;
  renderNextRace();
});

// fullscreen toggle v1
elFullscreen?.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// render init
renderNextRace();