/**
 * Front Desk
 */

import socket from "./socket.js";

const EVENTS = Object.freeze({
  CMD: Object.freeze({
    SESSION_ADD: "cmd:session:add",
    SESSION_REMOVE: "cmd:session:remove",
    DRIVER_ADD: "cmd:driver:add",
    DRIVER_REMOVE: "cmd:driver:remove",
  }),
  EVT: Object.freeze({
    STATE_UPDATE: "evt:state:update",
    CMD_REJECTED: "evt:cmd:rejected",
  }),
});

// ---------------- DOM ----------------
const $ = (sel) => document.querySelector(sel);

const elConn = $('[data-fd="conn-status"]');
const elSessionList = $('[data-fd="session-list"]');
const elSessionMeta = $('[data-fd="session-meta"]');
const elDriverList = $('[data-fd="driver-list"]');
const elPreview = $('[data-fd="next-preview"]');
const elLastUpdate = $('[data-fd="last-update"]');
const elMsg = $('[data-fd="form-msg"]');

const btnAddSession = document.querySelector('[data-action="fd-add-session"]');
const formAddDriver = $('[data-fd="add-driver-form"]');
const inputDriverName = $("#fd_driver_name");
const inputDriverCar = $("#fd_driver_car"); 

// ------------- UI-only state -------------
let state = null;               
let selectedSessionId = null;   

// ------------- helpers -------------
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

function setMsg(text = "", kind = "") {
  if (!elMsg) return;
  elMsg.textContent = text;
  elMsg.classList.remove("is-error", "is-info");
  if (kind) elMsg.classList.add(kind);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Backend state getters
function getUpcomingSessions(s) {
  return s?.sessions?.upcoming ?? [];
}

function getSessionById(s, id) {
  return getUpcomingSessions(s).find((x) => x.id === id) ?? null;
}

function ensureSelection() {
  const upcoming = getUpcomingSessions(state);

  if (!upcoming.length) {
    selectedSessionId = null;
    return null;
  }

  if (selectedSessionId) {
    const existing = getSessionById(state, selectedSessionId);
    if (existing) return existing;
  }

  selectedSessionId = upcoming[0].id;
  return upcoming[0];
}

// Session ID
function makeNextSessionId() {
  const upcoming = getUpcomingSessions(state);

  const nums = upcoming
    .map((s) => String(s.id ?? ""))
    .map((id) => {
      const m = id.match(/^S(\d+)$/i);
      return m ? Number(m[1]) : NaN;
    })
    .filter((n) => Number.isFinite(n));

  const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
  return `S${nextNum}`;
}

// ------------- render -------------
function renderSessions() {
  if (!elSessionList) return;

  const upcoming = getUpcomingSessions(state);

  if (!upcoming.length) {
    elSessionList.innerHTML = `<li class="muted">No sessions yet</li>`;
    return;
  }

  elSessionList.innerHTML = upcoming
    .map((sess) => {
      const isSelected = sess.id === selectedSessionId;
      const drivers = Array.isArray(sess.drivers) ? sess.drivers : [];
      return `
        <li class="slot ${isSelected ? "is-active" : ""}" data-session-id="${escapeHtml(sess.id)}">
          <div class="slot_left">
            <strong>${escapeHtml(sess.id)}</strong>
            <span class="muted">• ${drivers.length} driver${drivers.length === 1 ? "" : "s"}</span>
          </div>
          <button type="button"
                  class="btn btn_danger btn_small"
                  data-action="fd-remove-session"
                  data-session-id="${escapeHtml(sess.id)}">
            Remove
          </button>
        </li>
      `;
    })
    .join("");
}

function renderDetails() {
  if (!elSessionMeta || !elDriverList) return;

  const sess = ensureSelection();

  if (!sess) {
    elSessionMeta.textContent = "Select a session";
    elDriverList.innerHTML = `<li class="muted">No session selected</li>`;
    return;
  }

  const drivers = Array.isArray(sess.drivers) ? sess.drivers : [];
  elSessionMeta.textContent = `${sess.id} • ${drivers.length} driver${drivers.length === 1 ? "" : "s"}`;

  if (!drivers.length) {
    elDriverList.innerHTML = `<li class="muted">No drivers yet</li>`;
    return;
  }

  elDriverList.innerHTML = drivers
    .map((d) => {
      const car = d?.car ?? "—";
      const name = d?.name ?? "—";
      return `
        <li class="slot">
          <div class="slot_left">
            <strong>Car ${escapeHtml(car)}</strong>
            <span class="muted">• ${escapeHtml(name)}</span>
          </div>
          <button type="button"
                  class="btn btn_danger btn_small"
                  data-action="fd-remove-driver"
                  data-session-id="${escapeHtml(sess.id)}"
                  data-car="${escapeHtml(car)}">
            Remove
          </button>
        </li>
      `;
    })
    .join("");
}

function renderPreview() {
  if (!elPreview) return;

  // 
  const next = getUpcomingSessions(state)[0] ?? null;

  if (!next) {
    elPreview.innerHTML = `<li class="muted">No upcoming session</li>`;
    return;
  }

  const drivers = Array.isArray(next.drivers) ? next.drivers : [];
  if (!drivers.length) {
    elPreview.innerHTML = `<li class="muted">${escapeHtml(next.id)} • no drivers yet</li>`;
    return;
  }

  elPreview.innerHTML = drivers
    .map((d) => {
      const car = d?.car ?? "—";
      const name = d?.name ?? "—";
      return `<li class="slot"><strong>${escapeHtml(name)}</strong><span class="muted"> • Car ${escapeHtml(car)}</span></li>`;
    })
    .join("");
}

function renderAll() {
  if (!state) return;
  renderSessions();
  renderDetails();
  renderPreview();
}

// ------------- UI -> socket commands -------------

btnAddSession?.addEventListener("click", () => {
  setMsg("");
  const id = makeNextSessionId();
  socket.emit(EVENTS.CMD.SESSION_ADD, { id, drivers: [] });
});

elSessionList?.addEventListener("click", (e) => {
  const li = e.target.closest("[data-session-id]");
  if (!li) return;

  // ignore clicks on remove button
  if (e.target.closest('[data-action="fd-remove-session"]')) return;

  const id = li.getAttribute("data-session-id");
  if (!id) return;

  selectedSessionId = id;
  setMsg("");
  renderAll();
});

document.addEventListener("click", (e) => {
  // Remove session
  const rmSess = e.target.closest('[data-action="fd-remove-session"]');
  if (rmSess) {
    const id = rmSess.getAttribute("data-session-id");
    if (!id) return;
    setMsg("");
    socket.emit(EVENTS.CMD.SESSION_REMOVE, { id });
    return;
  }

  // Remove driver 
  const rmDriver = e.target.closest('[data-action="fd-remove-driver"]');
  if (rmDriver) {
    const sessionId = rmDriver.getAttribute("data-session-id");
    const carAttr = rmDriver.getAttribute("data-car");
    if (!sessionId || !carAttr) return;

    const car = Number.isFinite(Number(carAttr)) ? Number(carAttr) : carAttr;
    setMsg("");
    socket.emit(EVENTS.CMD.DRIVER_REMOVE, { sessionId, car });
  }
});

formAddDriver?.addEventListener("submit", (e) => {
  e.preventDefault();
  setMsg("");

  const sess = ensureSelection();
  if (!sess) {
    setMsg("Add/select a session first.", "is-error");
    return;
  }

  const name = (inputDriverName?.value ?? "").trim();
  if (!name) {
    setMsg("Enter a driver name.", "is-error");
    return;
  }

  // 
  const carNum = Number(inputDriverCar?.value);
  if (!Number.isFinite(carNum) || carNum < 1) {
    setMsg("Select a car number.", "is-error");
    return;
  }

  socket.emit(EVENTS.CMD.DRIVER_ADD, {
    sessionId: sess.id,
    driver: { name, car: carNum },
  });

  // Clear inputs
  if (inputDriverName) inputDriverName.value = "";
  if (inputDriverCar) inputDriverCar.value = "";
});

// ------------- socket -> UI -------------

socket.on("connect", () => {
  setConn(true);
  setLastUpdateNow();
});

socket.on("disconnect", () => {
  setConn(false);
});

socket.on(EVENTS.EVT.STATE_UPDATE, (snapshot) => {
  state = snapshot;
  setLastUpdateNow();
  setMsg("");
  renderAll();
});

socket.on(EVENTS.EVT.CMD_REJECTED, ({ reason } = {}) => {
  setMsg(reason || "Command rejected.", "is-error");
});

// Initial
renderAll();
