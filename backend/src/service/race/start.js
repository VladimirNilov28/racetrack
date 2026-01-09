export function startRace(state) {

    const { upcoming } = state.sessions;
    
    // Sessions update
    if (upcoming.length === 0) throw new Error("No upcoming sessions");

    const now = Date.now();


    return {
        ...state,
        sessions: {
            ...state.sessions,
            current: upcoming[0],
            upcoming: upcoming.slice(1),
        },
        timer: {
            ...state.timer,
            status: "running",
            startedAt: now,
            endsAt: now + 60 * 1000,
            durationSec: 60,
        }
    };
}