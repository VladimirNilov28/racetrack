export function recordLap(state, car) {
    const now = Date.now();
    const session = state.sessions.current;

    if (session === null) {
        throw new Error("No active session");
    }

    
    if (state.race.mode.value === "finish" && state.timer.status === "ended") throw new Error("Lap can't be recorded. It is alredy finished")
    if (state.timer.status !== "running") throw new Error("Lap is no active - it can not be recorded")
    // Check driver existence by car number (domain rule)
    const driverExists = session.drivers.some(d => d.car === car);
    if (!driverExists) {
        throw new Error(`Car ${car} does not exist in current session`);
    }

    if (state.timer.status === "idle") {
        throw new Error("Session is not started");
    }

    const updatedDrivers = session.drivers.map((driver) => {
        if (driver.car !== car) return driver;

        // We check if it's the first lap
        const isFirstLap = driver.lastLapAt === null;

        // If it's the first lap, we can't calculate lap time yet,
        // so we set lapTime to null
        const lapTime = isFirstLap ? null : now - driver.lastLapAt;

        // We calculate the next fastest lap time
        const nextFastestLap =
            lapTime === null
                ? driver.fastestLap
                : driver.fastestLap === null
                    ? lapTime
                    : Math.min(driver.fastestLap, lapTime);

        return {
            ...driver,
            laps: driver.laps + 1,
            lastLapAt: now,
            fastestLap: nextFastestLap,
        };
    });

    return {
        ...state,
        sessions: {
            ...state.sessions,
            current: {
                ...session,
                drivers: updatedDrivers,
            },
        },
    };
}
