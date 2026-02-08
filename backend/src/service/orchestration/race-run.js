import { startRace } from "../race/start.js";

export function raceRun(state, params) {
    // Only auto-start when there is a current session ready AND timer is idle.
    // This must NOT be triggered by "finish" directly.
    const autoStartNext = state.race?.autoStartNext ?? true;
    if (!autoStartNext) return state;

    if (state.timer?.status !== "idle") return state;
    if (!state.sessions?.current) return state;

    // You can decide: auto-start only if race mode is "danger" after endSession.
    if (state.race?.mode?.value !== "danger") return state;

    const durationSec = params?.durationSec ?? state._lastRaceDuration;
    if (durationSec == null)
        throw new Error("durationSec is required to start the next session");

    return startRace(state, durationSec);
}
