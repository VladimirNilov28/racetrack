export function startRace(state, durationSec = 60) {
    const now = Date.now();

    if (state.race.mode.value === "finish") {
        throw new Error(
            "Cannot start: current race is already finished. End the session first.",
        );
    }

    if (state.timer.status === "running") {
        throw new Error("Race is already running");
    }
    // If there is no current session yet, promote the next upcoming session
    let current = state.sessions.current;
    let upcoming = state.sessions.upcoming;

    if (!current) {
        if (!upcoming || upcoming.length === 0) {
            throw new Error("There is no upcoming session to start");
        }
        const [nextCurrent, ...rest] = upcoming;
        current = nextCurrent;
        upcoming = rest;
    }

    if (!durationSec || durationSec <= 0) {
        throw new Error("durationSec must be a positive number");
    }

    return {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: now,
        },
        race: {
            ...state.race,
            // Starting a race puts the system into SAFE mode
            mode: {
                value: "safe",
                updatedAt: now,
            },
        },
        sessions: {
            ...state.sessions,
            current,
            upcoming,
        },
        timer: {
            status: "running",
            startedAt: now,
            endsAt: now + durationSec * 1000,
            durationSec,
        },
    };
}
