import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { addDriver } from "./add.js";
import { add } from "winston";

function makeSession(id, drivers = []) {
    return { id, drivers };
}

describe("driver/add", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("throws if sessionId is missing", () => {
        const state = createInitialState();

        expect(() => addDriver(state, null, { name: "A", car: 1 })).toThrow(
            /session.*id/i,
        );
        expect(() => addDriver(state, "", { name: "A", car: 1 })).toThrow(
            /session.*id/i,
        );
    });

    it("throws if driver already exist in session", () => {
        const base = createInitialState();
        const s1 = makeSession("S1");
        let state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [s1] },
        };
        state = addDriver(state, "S1", { name: "Bob", car: 12 });
        expect(() =>
            addDriver(state, "S1", { name: "Alice", car: 1 }),
        ).not.toThrow();
        expect(() => addDriver(state, "S1", { name: "Bob", car: 2 })).toThrow(
            /driver.*already/i,
        );
    });

    it("throws if driver input is missing", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [makeSession("S1")] },
        };

        expect(() => addDriver(state, "S1", null)).toThrow(/driver/i);
        expect(() => addDriver(state, "S1", {})).toThrow();
    });

    it("throws if driver is missing name", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [makeSession("S1")] },
        };

        expect(() => addDriver(state, "S1", { car: 1 })).toThrow(/name/i);
    });

    it("throws if driver is missing car", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [makeSession("S1")] },
        };

        expect(() => addDriver(state, "S1", { name: "Alice" })).toThrow(/car/i);
    });

    it("throws if session is not found in current or upcoming", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [makeSession("S1")] },
        };

        expect(() =>
            addDriver(state, "S999", { name: "Alice", car: 1 }),
        ).toThrow(/session.*not found/i);
    });

    it("adds a driver to an upcoming session by sessionId (with defaults)", () => {
        const base = createInitialState();
        const s1 = makeSession("S1");
        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [s1] },
        };

        const result = addDriver(state, "S1", { name: "Alice", car: 7 });
        const updated = result.sessions.upcoming.find((s) => s.id === "S1");

        expect(updated.drivers).toEqual([
            {
                name: "Alice",
                car: 7,
                laps: 0,
                lastLapAt: null,
                fastestLap: null,
            },
        ]);
    });

    it("adds a driver to the current session by sessionId (with defaults)", () => {
        const base = createInitialState();
        const current = makeSession("CUR", []);
        const state = {
            ...base,
            sessions: { ...base.sessions, current },
        };

        const result = addDriver(state, "CUR", { name: "Bob", car: 12 });

        expect(result.sessions.current.drivers).toEqual([
            {
                name: "Bob",
                car: 12,
                laps: 0,
                lastLapAt: null,
                fastestLap: null,
            },
        ]);
    });

    it("throws if car number already exists in the target session", () => {
        const base = createInitialState();
        const s1 = makeSession("S1", [
            {
                name: "Alice",
                car: 7,
                laps: 0,
                lastLapAt: null,
                fastestLap: null,
            },
        ]);

        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [s1] },
        };

        expect(() => addDriver(state, "S1", { name: "Eve", car: 7 })).toThrow(
            /car/i,
        );
    });

    it("updates meta.updatedAt", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [makeSession("S1")] },
        };

        const result = addDriver(state, "S1", { name: "Alice", car: 7 });

        expect(result.meta.updatedAt).toBe(Date.now());
    });

    it("does not allow adding drivers to lastResult session", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: {
                ...base.sessions,
                lastResult: makeSession("R1", []),
            },
        };

        expect(() => addDriver(state, "R1", { name: "Alice", car: 7 })).toThrow(
            /lastresult|finished|not allowed/i,
        );
    });

    it("does not mutate original state (immutability smoke test)", () => {
        const base = createInitialState();
        const s1 = makeSession("S1", []);
        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [s1] },
        };

        const snapshot = structuredClone(state);
        const result = addDriver(state, "S1", { name: "Alice", car: 7 });

        expect(state).toEqual(snapshot);

        expect(result).not.toBe(state);
        expect(result.sessions).not.toBe(state.sessions);
        expect(result.sessions.upcoming).not.toBe(state.sessions.upcoming);

        const beforeSessionRef = state.sessions.upcoming[0];
        const afterSessionRef = result.sessions.upcoming[0];

        expect(afterSessionRef).not.toBe(beforeSessionRef);
        expect(afterSessionRef.drivers).not.toBe(beforeSessionRef.drivers);
    });
});
