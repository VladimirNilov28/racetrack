export function createInitialState() {
    return {
        meta: {
            version: 1,
            updatedAt: null,
        },

        sessions: {
            // list of sessions that will happen next
            upcoming: [],

            // current active session (or null if nothing is running)
            current: null,

            // last finished session results (shown on leaderboard until next start)
            lastResult: null,
        },

        race: {
            // race mode chosen by Safety Official (safe/race/hazard...)
            mode: {
                value: "safe",
                updatedAt: null,
            },

            // current flag shown on race-flags screen (green/yellow/red/checkered...)
            flag: {
                value: "green",  
                updatedAt: null,
            },
        },

        timer: {
            // timer state for countdown/leaderboard
            status: "idle",      // idle | running | ended
            startedAt: null,     // timestamp
            endsAt: null,        // timestamp
            durationSec: null,   // planned duration
            remainingSec: null,  // optional placeholder for later
        },
    };
}