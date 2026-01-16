/**
 * front-desk.js
 */

import socket from "./socket.js";

/* =========================================================================
   1) Event names 
   ========================================================================= */
const EVENTS = Object.freeze({
  CMD: Object.freeze({
    SESSION_ADD: "cmd:session:add",
    SESSION_UPDATE: "cmd:session:update",
    SESSION_REMOVE: "cmd:session:remove",

    DRIVER_ADD: "cmd:driver:add",
    DRIVER_UPDATE: "cmd:driver:update",
    DRIVER_REMOVE: "cmd:driver:remove",
  }),

  EVT: Object.freeze({
    STATE_UPDATE: "evt:state:update",
    CMD_REJECTED: "evt:cmd:rejected",
  }),
});

/* =========================================================================
   2) DOM references
   ========================================================================= */
const elConnStatus = document.querySelector('[data-fd="conn-status"]');
const elLastUpdate = document.querySelector('[data-fd="last-update"]');

const elSessionList = document.querySelector('[data-fd="session-list"]');
const elSessionMeta = document.querySelector('[data-fd="session-meta"]');
const elDriverList = document.querySelector('[data-fd="driver-list"]');
const elNextPreview = document.querySelector('[data-fd="next-preview"]');

const btnAddSession = document.querySelector('[data-action="fd-add-session"]');
const formAddDriver = document.querySelector('[data-fd="add-driver-form"]');
const inputDriverName = document.getElementById("fd_driver_name");
const elFormMsg = document.querySelector('[data-fd="form-msg"]');

/* =========================================================================
   3) Local UI-only state
   =========================================================================
*/
let serverState = null;       // last snapshot received from backend
let selectedSessionId = null; // session currently selected in UI

/* =========================================================================
   4) UI helpers
   ========================================================================= */
function setConnectionStatus(isOnline) {
  if (!elConnStatus) return;
  elConnStatus.textContent = isOnline ? "Online" : "Offline";
  elConnStatus.classList.toggle("badge_offline", !isOnline);
}

function setLastUpdateToNow() {
  if (!elLastUpdate) return;
  const t = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  elLastUpdate.textContent = t;
}

function showMessage(text = "", kind = "") {
  if (!elFormMsg) return;
  elFormMsg.textContent = text;

  // kind: "is-error" or "is-info"
  elFormMsg.classList.remove("is-error", "is-info");
  if (kind) elFormMsg.classList.add(kind);
}

/* =========================================================================
   5) Getters
   =========================================================================
*/
function getUpcomingSessions(snapshot) {
  return snapshot?.sessions?.upcoming ?? [];
}

function getCurrentSession(snapshot) {
  return snapshot?.sessions?.current ?? null;
}

function getLastResultSession(snapshot) {
  return snapshot?.sessions?.lastResult ?? null;
}

function getSessionId(sessionObj) {
  return sessionObj?.id ?? sessionObj?.sessionId ?? sessionObj?._id ?? sessionObj?.uuid ?? null;
}

function getSessionName(sessionObj, index) {
  return sessionObj?.name ?? sessionObj?.title ?? sessionObj?.id ?? `Session ${index + 1}`;
}

function getDriversFromSession(sessionObj) {
  return sessionObj?.drivers ?? [];
}

function getDriverId(driverObj) {
  return driverObj?.id ?? driverObj?.driverId ?? driverObj?._id ?? driverObj?.uuid ?? driverObj?.name;
}

function getDriverName(driverObj) {
  return driverObj?.name ?? driverObj?.driverName ?? "";
}

function getDriverCar(driverObj) {
  return driverObj?.car ?? driverObj?.carNumber ?? driverObj?.carId ?? null;
}

function ensureValidSelection() {
  const upcoming = getUpcomingSessions(serverState);

  if (!upcoming.length) {
    selectedSessionId = null;
    return null;
  }

  const found = upcoming.find((s) => getSessionId(s) === selectedSessionId);
  if (found) return found;

  selectedSessionId = getSessionId(upcoming[0]);
  return upcoming[0];
}

/* =========================================================================
   6) Rendering
   ========================================================================= */
function renderAll() {
  renderUpcomingSessionsList();
  renderSessionDetails();
  renderNextRacePreview();
}

function renderUpcomingSessionsList() {
  if (!elSessionList) return;
  elSessionList.innerHTML = "";

  const upcoming = getUpcomingSessions(serverState);

  if (!upcoming.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No sessions yet";
    elSessionList.appendChild(li);
    return;
  }

  upcoming.forEach((session, idx) => {
    const sid = getSessionId(session);
    const drivers = getDriversFromSession(session);

    const li = document.createElement("li");
    li.className = "slot";
    if (sid === selectedSessionId) li.classList.add("is-active");

    // Left side: click to select
    const left = document.createElement("div");
    left.innerHTML = `<strong>${escapeHtml(getSessionName(session, idx))}</strong> <span class="muted">• ${drivers.length} driver${drivers.length === 1 ? "" : "s"}</span>`;
    left.style.cursor = "pointer";
    left.addEventListener("click", () => {
      selectedSessionId = sid;
      showMessage("");
      renderAll();
    });

    // Right side: remove (command)
    const right = document.createElement("div");
    const btnRemove = document.createElement("button");
    btnRemove.type = "button";
    btnRemove.className = "btn btn_danger";
    btnRemove.textContent = "Remove";
    btnRemove.addEventListener("click", () => {
      socket.emit(EVENTS.CMD.SESSION_REMOVE, { sessionId: sid });
    });

    right.appendChild(btnRemove);
    li.append(left, right);
    elSessionList.appendChild(li);
  });
}

function renderSessionDetails() {
  if (!elSessionMeta || !elDriverList) return;

  const selected = ensureValidSelection();

  if (!selected) {
    elSessionMeta.textContent = "Select a session";
    elDriverList.innerHTML = `<li class="muted">No session selected</li>`;
    return;
  }

  const upcoming = getUpcomingSessions(serverState);
  const idx = upcoming.findIndex((s) => getSessionId(s) === selectedSessionId);

  const drivers = getDriversFromSession(selected);

  elSessionMeta.textContent = `${getSessionName(selected, idx >= 0 ? idx : 0)} • ${drivers.length} driver${drivers.length === 1 ? "" : "s"}`;

  elDriverList.innerHTML = "";

  if (!drivers.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = "No drivers yet";
    elDriverList.appendChild(li);
    return;
  }

  drivers.forEach((driver) => {
    const did = getDriverId(driver);
    const name = getDriverName(driver);
    const car = getDriverCar(driver);

    const li = document.createElement("li");
    li.className = "slot";

    const left = document.createElement("div");
    left.innerHTML = `<strong>Car ${car ?? "—"}</strong> <span class="muted">•</span> <span>${escapeHtml(name)}</span>`;

    const right = document.createElement("div");
    const btnRemove = document.createElement("button");
    btnRemove.type = "button";
    btnRemove.className = "btn btn_danger";
    btnRemove.textContent = "Remove";
    btnRemove.addEventListener("click", () => {
      socket.emit(EVENTS.CMD.DRIVER_REMOVE, { sessionId: selectedSessionId, driverId: did });
    });

    right.appendChild(btnRemove);
    li.append(left, right);
    elDriverList.appendChild(li);
  });
}

function renderNextRacePreview() {
  if (!elNextPreview) return;
  elNextPreview.innerHTML = "";

  const upcoming = getUpcomingSessions(serverState);
  const next = upcoming[0] ?? null;

  if (!next) {
    elNextPreview.innerHTML = `<li class="muted">No upcoming session</li>`;
    return;
  }

  const drivers = getDriversFromSession(next);
  if (!drivers.length) {
    elNextPreview.innerHTML = `<li class="muted">No drivers added</li>`;
    return;
  }

  drivers.forEach((d) => {
    const li = document.createElement("li");
    li.className = "slot";
    li.innerHTML = `<strong>${escapeHtml(getDriverName(d))}</strong> <span class="muted">•</span> <span>Car ${getDriverCar(d) ?? "—"}</span>`;
    elNextPreview.appendChild(li);
  });
}

/* =========================================================================
   7) UI actions -> socket commands
   =========================================================================
*/
btnAddSession?.addEventListener("click", () => {
  showMessage("");
  socket.emit(EVENTS.CMD.SESSION_ADD, {});
});

formAddDriver?.addEventListener("submit", (e) => {
  e.preventDefault();
  showMessage("");

  ensureValidSelection();
  if (!selectedSessionId) {
    showMessage("Select a session first.", "is-error");
    return;
  }

  const name = (inputDriverName?.value || "").trim();
  if (!name) {
    showMessage("Enter a driver name.", "is-error");
    return;
  }

  socket.emit(EVENTS.CMD.DRIVER_ADD, { sessionId: selectedSessionId, name });
  inputDriverName.value = "";
});

/* =========================================================================
   8) Socket -> UI
   ========================================================================= */
socket.on("connect", () => {
  setConnectionStatus(true);
  setLastUpdateToNow();
});

socket.on("disconnect", () => {
  setConnectionStatus(false);
});

socket.on(EVENTS.EVT.STATE_UPDATE, (snapshot) => {
  serverState = snapshot;
  ensureValidSelection();
  setLastUpdateToNow();
  showMessage("");
  renderAll();
});

socket.on(EVENTS.EVT.CMD_REJECTED, ({ event, reason } = {}) => {
  const msg = reason || "Command rejected";
  showMessage(msg, "is-error");
});

/* =========================================================================
   9) Initial paint
   ========================================================================= */
renderAll();

/* =========================================================================
   10) Util
   ========================================================================= */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
