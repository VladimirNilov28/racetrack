export function endSession(state) {
    if (state.sessions.current === null) {
        throw new Error("There is no current session");
    }

    if (state.race.mode.value !== "finish") {
        throw new Error("Session has not finished yet");
    }

    const now = Date.now();

    // Take the next session from upcoming (if any)
    const [nextCurrent = null, ...restUpcoming] = state.sessions.upcoming ?? [];

    return {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: now,
        },

        // After ending a session, race mode must be "danger" (red)
        race: {
            ...state.race,
            mode: {
                ...state.race.mode,
                value: "danger",
                updatedAt: now,
            },
        },

        // Move the next session into "current" and keep lastResult
        sessions: {
            ...state.sessions,
            lastResult: state.sessions.current,
            current: nextCurrent,
            upcoming: restUpcoming,
        },

        // Reset timer after the session ends
        timer: {
            status: "idle",
            startedAt: null,
            endsAt: null,
            durationSec: null,
        },
    };
}
