export function raceTick(state, now) {
    if (state.timer.status === "idle") return state;
    else if (state.timer.status === "ended") return state;
    else if (state.timer.status === "running" && state.timer.endsAt > now) return state;
    else return {
        ...state,
        race: {
            mode: {
                value: "finish",
                updatedAt: now,
            },
        },
        timer: {
            ...state.timer,
            status: "ended",
        },
    }
}