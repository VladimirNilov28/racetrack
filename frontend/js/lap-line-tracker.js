// new implementation
import socket from "./socket.js";
import {setConn, setupFullscreenToggle} from "./helpers/dom-helpers.js";
import {getRemainingTime, formatSessionTimer, createLocalTicker} from "./helpers/timer-helpers.js";
import {EVENTS} from "./helpers/constants.js";

const DEBOUNCE_TIME = 1000; // delay in milliseconds between lap record button presses

// DOM elements go here:
const elConn = document.querySelector(`[data-llt="conn-status"]`);
const elFlagMode = document.querySelector(`[data-llt="flag-mode"]`);
const elSessionId = document.querySelector(`[data-llt="session-id"]`);
const elTimerDisplay = document.querySelector(`[data-llt="timer-display"]`);
const elTimerValue = document.querySelector(`[data-llt="timer-value"]`);
const elFullscreen = document.getElementById("llt-fullscreen");
const elLapRecordButtons = Array.from(document.querySelectorAll(".llt-lap-button"));

let state = null;
const buttonDebounce = new Map();

// check if there's a session currently on
function getCurrentSession(s) {
  return s?.sessions?.current ?? null;
}

// ??? actually, can we remove this ???
function getDriverByCar(session, carNum) {
  if (!session?.drivers) return null;
  return session.drivers.find((d) => d.car === carNum) ?? null;
}

// ADD: proper grayout/disable logic for carNumButtHurts not in current race OR when no race is on
function canPressButton(carNum) {
  const session = getCurrentSession(state);
  if (!session) return false;
  const driver = getDriverByCar(session, carNum);
  return driver != null;
}

// button pressure measuring system with debounce calculator for each carNumButtHole
function recordButtonPress(carNum) {
  const now = Date.now();
  const lastPress = buttonDebounce.get(carNum) ?? 0;
  if (now - lastPress < DEBOUNCE_TIME) return; // calculate if debounce is needed. don't be an idiot.
  buttonDebounce.set(carNum, now);
  socket.emit(EVENTS.CMD.LAP_RECORD, {car: carNum});
}

// feedback for carNumButtHoles
function flashButton(btn) {
  btn.classList.add("llt-flash");
  setTimeout(() => btn.classList.remove("llt-flash"), 100); //timeout in ms
}

// MAIN RENDER FUNCTION
function renderLapLineTracker() {
  const currentSession = getCurrentSession(state);
  const isCurrentRace = state?.sessions?.current != null;
  const raceMode = state?.race?.mode?.value ?? "danger";
  const isRunning = state?.timer?.status === "running";
  const remainingTime = isRunning ? getRemainingTime(state) : null;

  if (elFlagMode) { // try set flag mode
    elFlagMode.textContent = raceMode.toUpperCase();
    elFlagMode.setAttribute("data-mode", raceMode);
  }

  if (elSessionId) { // fallback, when no race is on
    elSessionId.textContent = currentSession?.id ?? "N/A";
  }

  if (elTimerValue) { // fallback when no race is on
    elTimerValue.textContent = remainingTime != null ? formatSessionTimer(remainingTime) : "--:--";
  }

  if (!elTimerDisplay) { // let's gray out the timer when no race is on
    elTimerDisplay.classList.toggle("pub-flag-hidden", isCurrentRace);
  }

  elLapRecordButtons.forEach((btn) => {
    const carNum = parseInt(btn.dataset.car, 10);
    const driver = getDriverByCar(currentSession, carNum);
    const lapsEl = btn.querySelector(".llt-car-laps");
    if (lapsEl) {
      lapsEl.textContent = `Laps: ${driver?.laps ?? 0}`;
    }
    btn.disabled = !canPressButton(carNum);
  });
}

// super badass button numbering technique, shaolin master style: HI-YAH! (dead buttons everywhere)
elLapRecordButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const carNum = parseInt(btn.dataset.car, 10);
    if (!canPressButton(carNum)) return; // "...return of the Mack"
    recordButtonPress(carNum);
    flashButton(btn); // btn not carNum roflmao
  });
});

const localTicker = createLocalTicker(renderLapLineTracker);

// copy from leader-board
socket.on("connect", () => {
  setConn(elConn, true);
  renderLapLineTracker();
});

socket.on("disconnect", () => {
  setConn(elConn, false);
  localTicker.stop();
  renderLapLineTracker();
});

// Track ID: https://www.reddit.com/r/DnB/comments/1gycdrv/anyone_know_what_remix_this_is_of_roni_size/
socket.on(EVENTS.EVT.STATE_UPDATE, (snapshot) => {
  // DEBUG
  console.log("State received:", JSON.stringify(snapshot, null, 2));
  // DEBUG
  console.log("Drivers:", snapshot?.sessions?.current?.drivers?.map(d => ({ // DEBUG
    car: d.car,
    laps: d.laps,
    fastestLap: d.fastestLap,
  })));

  state = snapshot;
  renderLapLineTracker();
  if (state?.timer?.status === "running") {
    localTicker.start();
  } else {
    localTicker.stop();
  }
});

setupFullscreenToggle(elFullscreen);
renderLapLineTracker();