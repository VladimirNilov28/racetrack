import socket from "./socket.js";
import {setupFullscreenToggle} from "./helpers/dom-helpers.js";
import {EVENTS, validModes} from "./helpers/constants.js";

const elDisplay = document.getElementById("flag-display");
const elFullscreen = document.getElementById("pub-fullscreen");

function renderFlag(modeKey) {
  if (!elDisplay) return;

  // const validModes = ["safe", "hazard", "danger", "finish"];
  const mode = validModes.includes(modeKey) ? modeKey : "danger";

  elDisplay.setAttribute("data-mode", mode);
}

socket.on(EVENTS.EVT.STATE_UPDATE, (state) => {
  const currentMode = state?.race?.mode?.value;
  renderFlag(currentMode || "danger");
});

setupFullscreenToggle(elFullscreen);

// DEBUG: exposing socket globally for emulating lap-line-tracker, very noice.
if (typeof window !== "undefined") {
  window.debugSocket = socket;
  Object.defineProperty(window, "state", {get: () => state});
}

renderFlag("danger");