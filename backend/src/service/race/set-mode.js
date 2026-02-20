const MODES = new Set(["safe", "hazard", "danger", "finish"]);

export function setRaceMode(state, mode) {
    if (!MODES.has(mode)) {
        throw new Error(`Invalid race mode: ${mode}`);
    }

    // Once the race is finished, the mode is locked and cannot be changed
    if (state.race.mode.value === "finish") {
        throw new Error("Race mode is locked after finish");
    }

    const now = Date.now();

    return {
        ...state,
        meta: {
            ...state.meta,
            updatedAt: now,
        },
        race: {
            ...state.race,
            mode: {
                value: mode,
                updatedAt: now,
            },
        },
    };
}
