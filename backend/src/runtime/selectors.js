// Pure selectors — NO side effects, NO mutation

export function selectCurrentSession(state) {
    return state.sessions.current;
}

export function selectUpcomingSessions(state) {
    return state.sessions.upcoming;
}

export function selectLastResult(state) {
    return state.sessions.lastResult;
}

export function selectRaceMode(state) {
    return state.race.mode.value;
}

export function selectTimer(state) {
    return state.timer;
}

export function selectLeaderboard(state) {
    const session = state.sessions.current ?? state.sessions.lastResult;
    if (!session) return [];

    return [...session.drivers].sort((a, b) => {
        // More laps first
        if (b.laps !== a.laps) return b.laps - a.laps;
        
        // Faster lap wins (nulls last)
        if (a.fastestLap == null) return 1;
        if (b.fastestLap == null) return -1;

        return a.fastestLap - b.fastestLap;
    });
}
