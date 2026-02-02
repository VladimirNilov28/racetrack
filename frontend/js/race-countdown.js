import socket from './socket.js';

const EVENTS = Object.freeze({
  STATE_UPDATE: "evt:state:update",
});

let state = null;
let localTickerInterval = null;

const elTimer = document.getElementById('timer');

function getRemainingMs(s) {
  const t = s?.timer;
  if (!t || t.status !== 'running') return null;
  if (typeof t.endsAt === 'number') return t.endsAt - Date.now();
  return null;
}

function formatMMSS(ms) {
  if (ms == null || ms < 0) return '00:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderCountdown() {
  if (elTimer) {
    elTimer.textContent = formatMMSS(getRemainingMs(state));
  }
}

// local ticker - because the state isn't pushed from backend zillion times per second
function startLocalTicker() {
  stopLocalTicker();
  localTickerInterval = setInterval(renderCountdown, 250); // 250 = timeout
}

function stopLocalTicker() {
  if (localTickerInterval) {
    clearInterval(localTickerInterval);
    localTickerInterval = null;
  }
}

// ping button
const pingBtn = document.getElementById('ping-btn');
if (pingBtn) {
  pingBtn.addEventListener('click', () => {
    socket.emit('ping', 'pong');
  });
  socket.on('pong', () => {
    console.log('pong');
  });
}

socket.connect();

// for debugging purposes
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('connect_error', (err) => console.error('Connection error:', err));

// main event
socket.on(EVENTS.STATE_UPDATE, (snapshot) => {
  state = snapshot;
  renderCountdown();
  if (state?.timer?.status === 'running') {
    startLocalTicker();
  } else {
    stopLocalTicker();
  }
});

socket.on('disconnect', () => {
  stopLocalTicker();
});