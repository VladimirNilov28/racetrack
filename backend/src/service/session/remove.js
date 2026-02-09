export function removeSession(state, session_id) {
    if (!session_id) {
        throw new Error("Session id is required");
    }

    const exists = state.sessions.upcoming.some(el => el.id === session_id);

    if (!exists) {
        throw new Error(`Session id: ${session_id} not found in upcoming sessions`);
    }

    const now = Date.now();

    const new_upcoming = state.sessions.upcoming.filter(
        el => el.id !== session_id
    );

    return {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: now,
        },
        sessions: {
            ...state.sessions,
            upcoming: new_upcoming,
        },
    };
}
