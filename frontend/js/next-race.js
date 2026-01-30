import socket from "./socket.js";

// elements shall be defined here
const elContent = document.querySelector('[data-nr="content"]');
const elConn = document.querySelector('[data-nr="conn-status"]');
const elFullscreen = document.getElementById("pub-fullscreen");

let state= null;

const EVENTS = Object.freeze({
    STATE_UPDATE: "evt:state:update",
});

// helpers
function setConn(online) {
    if (!elConn) return;
    elConn.textContent = online ? "online" : "offline";
    elConn.classList.toggle("nr-conn--offline", !online);
    elConn.classList.toggle("nr-conn--online", online);
}

function escapeHtml(str) {
    return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getUpcomingSessions(s) {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing
    // broken?
    /* const sessions = s?.sessions ?? [];
    return sessions.filter(session => session.status === "upcoming"); */
    return s?.sessions?.upcoming ?? [];
}

// main render function
function renderNextRace() {
    if (!elContent) return;

    // handling disconnected state
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

    const upcomingSession = getUpcomingSessions(state);
    const next = upcomingSession[0] ?? null;

    // no upcoming sessions
    if (!next) {
        elContent.innerHTML = `
            <div class="nr-idle">
                <p class="nr-idle-icon">🙈</p>
                <p class="nr-idle-text">No upcoming races</p>
                <p class="nr-idle-sub">Please wait...</p>
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
    let driversHtml;
    if (drivers.length === 0) {
        driversHtml = `<li class="nr-driver nr-driver--empty">No racer data... Yet.</li>`;
    } else {
        driversHtml = drivers
            .map((d) => `
            <li class="nr-driver">
                <span class="nr-car">Car ${escapeHtml(d.car ?? "?")}</span>
                <span class="nr-name">${escapeHtml(d.name ?? "Unknown")}</span>
            </li>`)
        .join("");
    }

    elContent.innerHTML = `
        <div class="nr-session">
            <p class="nr-session-label">Session</p>
            <p class="nr-session-id">${escapeHtml(sessionId)}</p>
        </div>
        <ul class="nr-drivers">${driversHtml}</ul>
    `;
}

// sockets events
// first, connection checks
socket.on("connect", () => {
    setConn(true);
    renderNextRace();
})

socket.on("disconnect", () => {
    setConn(false);
    renderNextRace();
})

// second, main state event
socket.on(EVENTS.STATE_UPDATE, (snapshot) => {
    // next line is for debugging only:
    console.log("State received: ", JSON.stringify(snapshot, null, 2));
    state = snapshot;
    renderNextRace();
})

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