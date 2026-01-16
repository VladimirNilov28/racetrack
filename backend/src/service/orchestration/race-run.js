import { startRace } from "../race/start.js";
import { endSession } from "../session/end.js";

export function raceRun(state, params) {
    if (state.race.mode.value !== "finish") return state;

    const endedSession = endSession(state);
    const hasNextRace = endedSession.sessions.upcoming.length > 0;

    const start = (state, params) => {
        if (!params || params.durationSec == null) throw new Error("durationSec is missing");
        return startRace(state, params.durationSec);
    }

    return hasNextRace ? start(endedSession, params) : endedSession;


}