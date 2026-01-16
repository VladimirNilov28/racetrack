export function addDriver(state, sessionId, driverInput) {
    if (!sessionId) throw new Error("Session Id is required");

    if (state.sessions.lastResult && state.sessions.lastResult.id === sessionId) {
        throw new Error("Adding drivers to lastResult is not allowed");
    }

    if (!driverInput) throw new Error("Driver input is required");
    if (!driverInput.name) throw new Error("Driver name is required");
    if (driverInput.car === undefined || driverInput.car === null) {
        throw new Error("Driver car is required");
    }

    const now = Date.now();

    const newDriver = {
        ...driverInput,
        laps: 0,
        lastLapAt: null,
        fastestLap: null,
    }

    const current = state.sessions.current;
    const isCurrentTarget = state.sessions.current !== null && current.id === sessionId;

    const upcomingTarget = state.sessions.upcoming.find(s => s.id === sessionId);
    const isUpcomingTarget = Boolean(upcomingTarget);

    if (!isCurrentTarget && !isUpcomingTarget) {
        throw new Error(`Session not found ${sessionId}`);
    }

    const targetSession = isCurrentTarget ? current : upcomingTarget;
    const carExist = targetSession.drivers.some(d => d.car === newDriver.car);
    if (carExist) {
        throw new Error(`Car already exist in session: ${newDriver.car}`);
    }

    const updatedUpcoming = state.sessions.upcoming.map(session => {
        if (session.id !== sessionId) return session;

        return {
            ...session,
            drivers: [...session.drivers, newDriver],
        };
    });

    const updatedCurrent = isCurrentTarget
        ? {
            ...current,
            drivers: [...current.drivers, newDriver],
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
        }
    }

}