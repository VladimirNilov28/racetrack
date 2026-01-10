const MODES = new Set(["safe", "hazard", "danger", "finish"]);

export function setRaceMode(state, mode) {

    if (!MODES.has(mode)) throw new Error(`Invalid race mode: ${mode}`);
    if (state.race.mode.value === "finish") return { ...state };

    const now = Date.now()

    return {
        ...state,
        race: {
            ...state.race,
            mode: {
                value: mode,
                updatedAt: now,
            },
        },
    };
}