import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { editDriver } from "./edit.js";

function makeDriver({
    name = "Alice",
    car = 1,
    laps = 0,
    lastLapAt = null,
    fastestLap = null,
} = {}) {
    return { name, car, laps, lastLapAt, fastestLap };
}

function makeSession(id, drivers = []) {
    return { id, drivers };
}

describe("driver/edit", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("throws if sessionId is missing", () => {
        const state = createInitialState();
        expect(() => editDriver(state, null, 1, { name: "X" })).toThrow(
            /session.*id/i,
        );
        expect(() => editDriver(state, "", 1, { name: "X" })).toThrow(
            /session.*id/i,
        );
    });

    it("throws if carNumber is missing", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: {
                ...base.sessions,
                upcoming: [makeSession("S1", [makeDriver({ car: 1 })])],
            },
        };

        expect(() => editDriver(state, "S1", null, { name: "X" })).toThrow(
            /car/i,
        );
        expect(() => editDriver(state, "S1", undefined, { name: "X" })).toThrow(
            /car/i,
        );
    });

    it("throws if patch is missing or empty", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: {
                ...base.sessions,
                upcoming: [makeSession("S1", [makeDriver({ car: 1 })])],
            },
        };

        expect(() => editDriver(state, "S1", 1, null)).toThrow(/patch|update/i);
        expect(() => editDriver(state, "S1", 1, {})).toThrow(/patch|update/i);
    });

    it("throws if session is not found in current or upcoming", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [makeSession("S1")] },
        };

        expect(() => editDriver(state, "S999", 1, { name: "X" })).toThrow(
            /session.*not found/i,
        );
    });

    it("does not allow editing drivers in lastResult", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: {
                ...base.sessions,
                lastResult: makeSession("R1", [makeDriver({ car: 1 })]),
            },
        };

        expect(() => editDriver(state, "R1", 1, { name: "X" })).toThrow(
            /lastresult|not allowed/i,
        );
    });

    it("throws if driver is not found by carNumber in the target session", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: {
                ...base.sessions,
                upcoming: [makeSession("S1", [makeDriver({ car: 1 })])],
            },
        };

        expect(() => editDriver(state, "S1", 99, { name: "X" })).toThrow(
            /driver.*not found/i,
        );
    });

    it("throws if driver already exist in session", () => {
        const base = createInitialState();
        const d1 = makeDriver({
            name: "Alice",
            car: 7,
            laps: 3,
            lastLapAt: 1000,
            fastestLap: 250,
        });
        const d2 = makeDriver({
            name: "Bob",
            car: 8,
            laps: 2,
            lastLapAt: 1500,
            fastestLap: 200,
        });

        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [makeSession("S1", [d1, d2])] },
        };

        expect(() => editDriver(state, "S1", 8, { name: "Bob" })).toThrow(
            /driver.*already exists/i,
        );
    });

    it("edits driver name in an upcoming session (keeps timing stats untouched)", () => {
        const base = createInitialState();
        const d1 = makeDriver({
            name: "Alice",
            car: 7,
            laps: 3,
            lastLapAt: 1000,
            fastestLap: 250,
        });

        const state = {
            ...base,
            sessions: { ...base.sessions, upcoming: [makeSession("S1", [d1])] },
        };

        const result = editDriver(state, "S1", 7, { name: "Alicia" });
        const updatedSession = result.sessions.upcoming.find(
            (s) => s.id === "S1",
        );
        const updatedDriver = updatedSession.drivers.find((d) => d.car === 7);

        expect(updatedDriver).toEqual({
            name: "Alicia",
            car: 7,
            laps: 3,
            lastLapAt: 1000,
            fastestLap: 250,
        });
    });

    it("edits driver car in current session (car must stay unique)", () => {
        const base = createInitialState();

        const current = makeSession("CUR", [
            makeDriver({ name: "Alice", car: 7 }),
            makeDriver({ name: "Bob", car: 12 }),
        ]);

        const state = { ...base, sessions: { ...base.sessions, current } };

        const result = editDriver(state, "CUR", 7, { car: 99 });

        expect(
            result.sessions.current.drivers
                .map((d) => d.car)
                .sort((a, b) => a - b),
        ).toEqual([12, 99]);
    });

    it("throws if new car already exists in the same session", () => {
        const base = createInitialState();
        const current = makeSession("CUR", [
            makeDriver({ name: "Alice", car: 7 }),
            makeDriver({ name: "Bob", car: 12 }),
        ]);

        const state = { ...base, sessions: { ...base.sessions, current } };

        expect(() => editDriver(state, "CUR", 7, { car: 12 })).toThrow(
            /car.*exists|car.*unique/i,
        );
    });

    it("updates meta.updatedAt", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: {
                ...base.sessions,
                upcoming: [makeSession("S1", [makeDriver({ car: 7 })])],
            },
        };

        const result = editDriver(state, "S1", 7, { name: "X" });
        expect(result.meta.updatedAt).toBe(Date.now());
    });

    it("does not mutate original state (immutability smoke test)", () => {
        const base = createInitialState();
        const state = {
            ...base,
            sessions: {
                ...base.sessions,
                upcoming: [
                    makeSession("S1", [makeDriver({ name: "Alice", car: 7 })]),
                ],
            },
        };

        const snapshot = structuredClone(state);
        const result = editDriver(state, "S1", 7, { name: "Alicia" });

        expect(state).toEqual(snapshot);

        expect(result).not.toBe(state);
        expect(result.sessions).not.toBe(state.sessions);
        expect(result.sessions.upcoming).not.toBe(state.sessions.upcoming);

        const beforeSessionRef = state.sessions.upcoming[0];
        const afterSessionRef = result.sessions.upcoming[0];
        expect(afterSessionRef).not.toBe(beforeSessionRef);

        expect(afterSessionRef.drivers).not.toBe(beforeSessionRef.drivers);
        expect(afterSessionRef.drivers[0]).not.toBe(
            beforeSessionRef.drivers[0],
        );
    });
});
