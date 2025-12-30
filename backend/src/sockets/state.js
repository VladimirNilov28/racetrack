/**
 * Single in-memory source of truth for the whole server.
 */

export const state = {

    /**
     * It records when state changed last time
     */
    meta: {
        version: 1,
        updateAt: null,
    },

    /**
     * Heard of system
     *   - upcoming: Collect array of upcoming races
     *   - current: Current race
     *   - lastResult: Collect last closest race
     */
    sessions: {
        upcoming: [],
        current: null,
        lastResult: null,
    },

    race: {
        mode: { value: "safe"}
    }

}