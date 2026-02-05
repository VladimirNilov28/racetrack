import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "./state-init.js";
import { startRace } from "./race/start.js";
import { finishRace } from "./race/finish.js";
import { recordLap } from "./lap-record.js";

describe("recordLap", () => {
    const T0 = new Date("2026-01-10T12:00:00.000Z");
    const at = (iso) => vi.setSystemTime(new Date(iso));

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(T0);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function makeRunningStateWithCars(cars = [1]) {
        const state = createInitialState();
        state.sessions.upcoming.push({
            id: "s1",
            drivers: cars.map((car) => ({
                car,
                laps: 0,
                lastLapAt: null,
                fastestLap: null,
            })),
        });

        return startRace(state);
    }

    function getDriver(state, car) {
        return state.sessions.current.drivers.find((d) => d.car === car);
    }

    it("increments laps for the given car", () => {
        const running = makeRunningStateWithCars([1, 2]);

        const next = recordLap(running, 2);

        expect(getDriver(next, 2).laps).toBe(1);
        expect(getDriver(next, 1).laps).toBe(0);
    });

    it("sets lastLapAt and fastestLap on first lap (from race start)", () => {
        const running = makeRunningStateWithCars([1]);

        at("2026-01-10T12:00:10.000Z"); // +10s from start
        const next = recordLap(running, 1);

        const d1 = getDriver(next, 1);
        expect(d1.laps).toBe(1);
        expect(d1.lastLapAt).toBe(Date.now());
        expect(d1.fastestLap).toBe(10_000);
    });

    it("computes lap time on second lap using lastLapAt and keeps fastestLap", () => {
        const running = makeRunningStateWithCars([1]);

        at("2026-01-10T12:00:10.000Z"); // first lap = 10s
        const afterFirst = recordLap(running, 1);

        at("2026-01-10T12:00:20.000Z"); // second lap = 10s
        const afterSecond = recordLap(afterFirst, 1);

        const d1 = getDriver(afterSecond, 1);
        expect(d1.laps).toBe(2);
        expect(d1.fastestLap).toBe(10_000);
    });

    it("updates fastestLap only if the new lap is faster", () => {
        const running = makeRunningStateWithCars([1]);

        at("2026-01-10T12:00:12.000Z"); // first lap = 12s
        const s1 = recordLap(running, 1);

        at("2026-01-10T12:00:24.000Z"); // second lap = 12s
        const s2 = recordLap(s1, 1);

        at("2026-01-10T12:00:38.000Z"); // third lap = 14s (slower)
        const s3 = recordLap(s2, 1);

        expect(getDriver(s3, 1).fastestLap).toBe(12_000);
    });

    it("throws if there is no current session", () => {
        const state = createInitialState();
        state.timer.status = "running";

        expect(() => recordLap(state, 1)).toThrow(/no active session/i);
    });

    it("throws if timer is idle (race not started)", () => {
        const state = createInitialState();
        state.sessions.current = {
            id: "s1",
            drivers: [{ car: 1, laps: 0, lastLapAt: null, fastestLap: null }],
        };

        expect(() => recordLap(state, 1)).toThrow(/not started|idle/i);
    });

    it("throws if car is not part of current session", () => {
        const running = makeRunningStateWithCars([1, 2]);

        expect(() => recordLap(running, 99)).toThrow(/does not exist|car 99/i);
    });

    it("does not mutate original state", () => {
        const running = makeRunningStateWithCars([1]);

        at("2026-01-10T12:00:10.000Z");
        const next = recordLap(running, 1);

        expect(next).not.toBe(running);

        expect(getDriver(running, 1).laps).toBe(0);
        expect(getDriver(next, 1).laps).toBe(1);
    });

    it("doesnt allow recording laps when race is finished (finish mode)", () => {
        const running = makeRunningStateWithCars([1]);
        const finished = finishRace(running);

        expect(() => recordLap(finished, 1)).toThrow(/finish|finished|ended/i);
        expect(getDriver(finished, 1).laps).toBe(0);
    });
});
