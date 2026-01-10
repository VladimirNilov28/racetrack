export function finishRace(state) {
    if (state.sessions.current === null) throw new Error("No active sessions");

    if (state.race.mode.value === "finish") return { ...state };

    const now = Date.now();

    return {
        ...state,
        race: {
            mode:{
                value: "finish",
                updatedAt: now,
            }
        },
        timer: {
            ...state.timer,
            status: "ended",
            endsAt: now,
        },
    };
}