import { startRace } from "../race/start.js";
import { endSession } from "../session/end.js";

export function raceRun(state, params) {
    if (state.race.mode.value !== "finish") return state;

    const endedSession = endSession(state);
    const hasNextRace = endedSession.sessions.upcoming.length > 0;

    if (!hasNextRace) {
        return endedSession;
    }
    
    // Toggle manual auto-start if enabled in state
    const autoStartNext = endedSession.race?.autoStartNext ?? true;
    if (!autoStartNext) {
        return endedSession;
    }

    // Use provided durationSec or fall back to previously stored duration
    const durationSec = params?.durationSec ?? state._lastRaceDuration;

    if (durationSec === undefined || durationSec === null) {
        throw new Error("durationSec is required to start the next session");
    }

    // Start the next race
    return startRace(endedSession, durationSec);
}
