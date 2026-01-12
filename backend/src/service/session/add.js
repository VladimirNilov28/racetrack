export function addSession(state, new_session) {
    if (!new_session) throw new Error("New session can not be null");

    if (!new_session.id) {
        throw new Error("Session is missing id");
    }

    if (!new_session.drivers) {
        throw new Error("Session is missing drivers");
    }

    if (!Array.isArray(new_session.drivers)) {
        throw new Error("Session drivers must be an array");
    }

    if (state.sessions.upcoming.some(el => el.id === new_session.id)) {
        throw new Error(`Id: ${new_session.id} already exist in upcoming`);
    }

    if (state.sessions.current && state.sessions.current.id === new_session.id) {
        throw new Error(`Id: ${new_session.id} already exists in current session`);
    }

    if (state.sessions.lastResult && state.sessions.lastResult.id === new_session.id) {
        throw new Error(`Id: ${new_session.id} already exists in current lastResult`);
    }

    const sessionToAdd = {
        ...new_session,
        drivers: [...new_session.drivers],
    };

    const updated_upcoming = [
        ...state.sessions.upcoming,
        sessionToAdd,
    ];

    const now = Date.now();

    return {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: now,
        },
        sessions: {
            ...state.sessions,
            upcoming: updated_upcoming,
        },
    };
}
