export function endSession(state) {
    if (state.sessions.current === null) throw new Error("There is no current sessions");
    if (state.race.mode.value !== "finish") throw new Error("Session has not finished yet");

    const now = Date.now();

    return {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: now,
        },
        race: {
            ...state.race,
            mode:{
                ...state.race.mode,
                value: "safe",
                updatedAt: now,
            }
        },
        sessions: {
            ...state.sessions,
            lastResult: state.sessions.current,
            current: null,
        },
        timer: {
            status: "idle",
            startedAt: null,
            endsAt: null,
            durationSec: null,
        },
    }
}