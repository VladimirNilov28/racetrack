export function recordLap(state, car) {
    const now = Date.now();
    const session = state.sessions.current;

    if (car > session.drivers.length) throw new Error(`${car} is not exist in current session`);
    if (state.timer.status === "idle") throw new Error(`Session is not started`);
    const updatedDrivers = session.drivers.map((driver) => {
        if (driver.car !== car) return driver;

        // We check if it's the first lap
        const isFirstLap = driver.lastLapAt === null;

        // If it's the first lap, we can't calculate lap time yet,
        // so we set lapTime to null
        const lapTime = isFirstLap ? null : now - driver.lastLapAt;

        // We calculate the next fastest lap time
        const nextFastestLap =
            // If lapTime is null (first lap), fastest lap stays the same
            lapTime === null
                ? driver.fastestLap
                // If this is the first recorded lap, it becomes the fastest lap
                : driver.fastestLap === null
                    ? lapTime
                    // Otherwise, we compare and keep the fastest lap
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
