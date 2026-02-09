// src/service/lap-record.js

export function recordLap(state, car) {
    const now = Date.now();
    const session = state.sessions.current;

    if (session === null) {
        throw new Error("No active session");
    }

    if (car === undefined || car === null) {
        throw new Error("Car is required");
    }

    if (state.timer.status === "idle") {
        throw new Error("Session is not started");
    }

    if (state.timer.status === "idle") {
        throw new Error("Session is not started");
    }

    if (state.timer.status === "ended" && state.race.mode.value === "finish") {
        throw new Error("Lap can't be recorded. Race is finished");
    }

    const driverExists = session.drivers.some((d) => d.car === car);
    if (!driverExists) {
        throw new Error(`Car ${car} does not exist in current session`);
    }

    const startedAt = state.timer.startedAt;
    if (startedAt === null) {
        throw new Error("Timer startedAt is missing");
    }

    const updatedDrivers = session.drivers.map((driver) => {
        if (driver.car !== car) return driver;

        const baseline = driver.lastLapAt ?? startedAt;
        const lapTime = now - baseline;

        const nextFastestLap =
            driver.fastestLap === null
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
        meta: {
            ...state.meta,
            updatedAt: now,
        },
        sessions: {
            ...state.sessions,
            current: {
                ...session,
                drivers: updatedDrivers,
            },
        },
    };
}
