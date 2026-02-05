import socket from './socket.js';

const elDisplay = document.getElementById('flag-display');
const elFullscreen = document.getElementById('pub-fullscreen');

const EVENTS = Object.freeze({
  STATE_UPDATE: 'evt:state:update',
});

function renderFlag(modeKey) {
  if (!elDisplay) return;

  const validModes = ['safe', 'hazard', 'danger', 'finish'];
  const mode = validModes.includes(modeKey) ? modeKey : 'danger';

  elDisplay.setAttribute('data-mode', mode);
}

socket.on(EVENTS.STATE_UPDATE, (state) => {
  const currentMode = state?.race?.mode?.value;
  renderFlag(currentMode || 'danger');
});

elFullscreen?.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

renderFlag('danger');