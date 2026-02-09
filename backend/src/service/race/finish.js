export function finishRace(state) {
    if (state.sessions.current === null) throw new Error("No active session");

    // Idempotent: finishing twice should not change state
    if (state.race.mode.value === "finish") return { ...state };

    const now = Date.now();

    return {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: now,
        },

        // Keep current session visible, but persist it as "lastResult" for leaderboard screens
        sessions: {
            ...state.sessions,
            lastResult: state.sessions.current,
        },

        // Lock race mode to "finish"
        race: {
            ...state.race,
            mode: {
                ...state.race.mode,
                value: "finish",
                updatedAt: now,
            },
        },

        // Stop the timer
        timer: {
            ...state.timer,
            status: "ended",
            endsAt: now, // record the actual finish moment (manual finish or timer finish)
        },
    };
}
