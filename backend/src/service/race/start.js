import logger from "../../logger.js";

export function startRace(state) {
    
    // Sessions update
    if (state.sessions.upcoming.length !== 0) {
        state.sessions.lastResult = state.sessions.current;
        state.sessions.current = state.sessions.upcoming.shift();
    } else {
        throw new Error("No upcoming sessions")
    }

    return state;
}