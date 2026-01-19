export function startRace(state, duration = 60) {

    const { upcoming } = state.sessions;
    
    // Sessions update
    if (upcoming.length === 0) throw new Error("No upcoming sessions");

    if (state.timer.status === "running") throw new Error("Current race is already active and can not be started");

    const now = Date.now();


    return {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: now,
        },
        sessions: {
            ...state.sessions,
            current: upcoming[0],
            upcoming: upcoming.slice(1),
        },
        timer: {
            ...state.timer,
            status: "running",
            startedAt: now,
            endsAt: now + duration * 1000,
            durationSec: duration,
        },
        _lastRaceDuration: duration,  // Store for auto-start of next race
    };
}