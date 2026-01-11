export function createInitialState() {
    return {
        meta: {
            // service/meta information
            version: 1,

            // timestamp when state was last updated
            updatedAt: null,
        },

        sessions: {
            /*
              ARRAY of Session objects (order matters)

              Example:
              [
                {
                  id: "s1",
                  drivers: [Driver, Driver, ...]
                },
                {
                  id: "s2",
                  drivers: [Driver, Driver, ...]
                }
              ]
            */
            upcoming: [],

            /*
              OBJECT or null

              When race is running:
              {
                id: "s1",
                drivers: [Driver, Driver, ...]
              }

              When no active race:
              null
            */
            current: null,

            /*
              OBJECT or null
              Copy of finished session
              Used by leaderboard until next race starts
            */
            lastResult: null,
        },

        race: {
            // race process state (NOT session data)
            mode: {
                // "safe" | "hazard" | "danger" | "finish"
                value: "safe",

                // timestamp when race mode was last changed
                updatedAt: null,
            },
        },

        timer: {
            // countdown timer state
            status: "idle",      // "idle" | "running" | "ended"

            // timestamp when race started
            startedAt: null,

            // timestamp when race ends or ended early
            endsAt: null,

            // planned race duration in seconds
            durationSec: null,
        },
    };
}


/* Session object */
const session = {
  id: "s<count>",

  /* ARRAY of Driver objects */
  drivers: [
    {
      name: "Alice",      // driver name
      car: 1,             // car number (race identity)
      laps: 0,            // completed laps
      lastLapAt: null,    // last lap timestamp
      fastestLap: null,   // fastest lap time in ms
    },
  ],
}

