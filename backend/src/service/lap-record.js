export function recordLap(state, car) {
    const now = Date.now();
    const session = state.sessions.current;

    if (car > session.drivers.length) throw new Error(`${car} is not exist in current session`);
    if (state.timer.status === "idle") throw new Error(`Session is not started`);
    const updatedDrivers = session.drivers.map((driver) => {
        if (driver.car !== car) return driver;

        const isFirstLap = driver.lastLapAt === null;
        const lapTime = isFirstLap ? null : now - driver.lastLapAt;

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
