/**
 * timer functions for public-facing page scripts will be moved here
 */

// Lap time converter-formatter
export function formatLapTime(ms) {
  if (ms == null) return "--:--.---";
  const totalMs = Math.floor(ms);
  const mins = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${mins}:${String(secs).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

// Get remaining session time...
export function getRemainingTime(state) {
  const t = state?.timer;
  if (!t || t.status !== "running") return null;
  if (typeof t.endsAt === "number") return t.endsAt - Date.now();
  return null;
}

// ...and format ms to mm:ss
export function formatSessionTimer(ms) {
  if (ms == null || ms < 0) return "00:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Local ticker factory
export function createLocalTicker(renderCallback, interval = 250) {
  let tickerInterval = null;

  return {
    start() {
      this.stop();
      tickerInterval = setInterval(renderCallback, interval);
    },
    stop() {
      if (tickerInterval) {
        clearInterval(tickerInterval);
        tickerInterval = null;
      }
    },
  };
}