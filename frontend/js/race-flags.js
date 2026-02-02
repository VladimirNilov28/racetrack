import socket from './socket.js';

// elements shall be defined here
const elDisplay = document.getElementById('flag-display');
/* common elements will be later consolidated to 'pub-' */
const elFullscreen = document.getElementById('pub-fullscreen');

// states shall be defined here
const MODES = {
  safe: {
    className: 'safe',
  },
  hazard: {
    className: 'hazard',
  },
  danger: {
    className: 'danger',
  },
  finish: {
    className: 'finish',
  },
  idle: {
    className: 'idle',
  },
};

const EVENTS = Object.freeze({
  STATE_UPDATE: 'evt:state:update',
});

// main render function
function renderFlag(modeKey) {
  // modes are determined by mode key
  const config = MODES[modeKey] || MODES.idle;

  // update container class:
  // first, getting rid of all potential flag classes
  Object.values(MODES).forEach((m) => {
    if (m.className) elDisplay.classList.remove(m.className);
  });

  // second, add new valid class:
  elDisplay.classList.add(config.className);
}

socket.on(EVENTS.STATE_UPDATE, (state) => {
  // check for state existence
  const currentMode = state?.race?.mode?.value;

  // state will default to 'idle' if no mode is set in state
  renderFlag(currentMode || 'idle');
});

// fullscreen toggle v1
elFullscreen?.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// render init
renderFlag('idle');