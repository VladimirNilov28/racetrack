import { finishRace } from "../race/finish.js";

export function raceTick(state, now = Date.now()) {
    // Only running timer can trigger finishing
    if (state.timer.status !== "running") return state;

    // Defensive: if endsAt is missing, we can't decide time-based finish
    if (state.timer.endsAt === null) return state;

    // Not yet time to finish
    if (now < state.timer.endsAt) return state;

    // Defensive: finishRace requires an active current session
    if (state.sessions.current === null) return state;

    // Time is up -> delegate to domain brick
    return finishRace(state);
}
