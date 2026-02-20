import { describe, it, expect } from "vitest";
import { createInitialState } from "../state-init.js";
import { setRaceMode } from "./set-mode.js";

describe("setRaceMode", () => {
    it("sets race mode to the given value", () => {
        const state = createInitialState();

        const next = setRaceMode(state, "hazard");

        expect(next.race.mode.value).toBe("hazard");
    });

    it("updates race mode timestamp", () => {
        const state = createInitialState();

        const next = setRaceMode(state, "danger");

        expect(next.race.mode.updatedAt).not.toBeNull();
    });

    it("throws when trying to change mode after finish (mode is locked)", () => {
        const base = createInitialState();

        // Build a finished state without mutating the original
        const finished = {
            ...base,
            race: {
                ...base.race,
                mode: { ...base.race.mode, value: "finish" },
            },
        };

        expect(() => setRaceMode(finished, "safe")).toThrow(/locked|finish/i);
    });

    it("throws if mode is invalid", () => {
        const state = createInitialState();

        expect(() => setRaceMode(state, "purple")).toThrow();
    });

    it("does not mutate original state", () => {
        const state = createInitialState();

        const next = setRaceMode(state, "hazard");

        expect(next).not.toBe(state);
        // Fresh boot state is danger in your new spec
        expect(state.race.mode.value).toBe("danger");
    });
});
