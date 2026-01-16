export function editDriver(state, sessionId, carNumber, patch) {
    if (!sessionId) throw new Error("Session id is required");
    if (carNumber === null || carNumber === undefined) throw new Error("Car number is required");

    if (!patch || Object.keys(patch).length === 0) {
        throw new Error("Patch must contain at least one field");
    }

    // Allow only name and car
    const allowedKeys = ["name", "car"];
    for (const key of Object.keys(patch)) {
        if (!allowedKeys.includes(key)) {
            throw new Error(`Field '${key}' cannot be updated`);
        }
    }

    if ("name" in patch && !patch.name) {
        throw new Error("Driver name cannot be empty");
    }

    if ("car" in patch && (patch.car === null || patch.car === undefined)) {
        throw new Error("Driver car is required");
    }

    if (state.sessions.lastResult && state.sessions.lastResult.id === sessionId) {
        throw new Error("Editing lastResult is not allowed");
    }

    const now = Date.now();

    const current = state.sessions.current;
    const isCurrentTarget = current !== null && current.id === sessionId;

    const upcomingTarget = state.sessions.upcoming.find(s => s.id === sessionId);
    const isUpcomingTarget = Boolean(upcomingTarget);

    if (!isCurrentTarget && !isUpcomingTarget) {
        throw new Error(`Session not found: ${sessionId}`);
    }

    const targetSession = isCurrentTarget ? current : upcomingTarget;

    const driverExists = targetSession.drivers.some(d => d.car === carNumber);
    if (!driverExists) {
        throw new Error(`Driver not found: car ${carNumber}`);
    }

    // If car is changing, enforce uniqueness inside the same session
    if ("car" in patch && patch.car !== carNumber) {
        const carTaken = targetSession.drivers.some(d => d.car === patch.car);
        if (carTaken) {
            throw new Error(`Car already exists in session: ${patch.car}`);
        }
    }

    const patchDriver = (driver) => {
        if (driver.car !== carNumber) return driver;

        return {
            ...driver,
            car: patch.car ?? driver.car,
            name: patch.name ?? driver.name,
        };
    };

    const updatedUpcoming = state.sessions.upcoming.map(session => {
        if (session.id !== sessionId) return session;

        return {
            ...session,
            drivers: session.drivers.map(patchDriver),
        };
    });

    const updatedCurrent = isCurrentTarget
        ? {
            ...current,
            drivers: current.drivers.map(patchDriver),
        }
        : current;

    return {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: now,
        },
        sessions: {
            ...state.sessions,
            upcoming: updatedUpcoming,
            current: updatedCurrent,
        },
    };
}
