export function removeDriver(state, sessionId, carNumber) {
    if (!sessionId) throw new Error("Session id is required");
    if (carNumber === null || carNumber === undefined) throw new Error("Car number is required");

    if (state.sessions.lastResult?.id === sessionId) {
        throw new Error("Deleting drivers from lastResult is not allowed");
    }

    const current = state.sessions.current;
    const isCurrentTarget = current !== null && current.id === sessionId;

    const upcomingTarget = state.sessions.upcoming.find(s => s.id === sessionId);
    const isUpcomingTarget = upcomingTarget !== undefined;

    if (!isCurrentTarget && !isUpcomingTarget) {
        throw new Error(`Session not found: ${sessionId}`);
    }

    const targetSession = isCurrentTarget ? current : upcomingTarget;

    const driverExists = targetSession.drivers.some(d => d.car === carNumber);
    if (!driverExists) {
        throw new Error(`Driver not found: car ${carNumber}`);
    }

    const now = Date.now();

    const updatedUpcoming = isUpcomingTarget
        ? state.sessions.upcoming.map(session => {
            if (session.id !== sessionId) return session;

            return {
                ...session,
                drivers: session.drivers.filter(d => d.car !== carNumber),
            };
        })
        : state.sessions.upcoming;

    const updatedCurrent = isCurrentTarget
        ? {
            ...current,
            drivers: current.drivers.filter(d => d.car !== carNumber),
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
