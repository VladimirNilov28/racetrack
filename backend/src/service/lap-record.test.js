import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "./state-init.js";
import { startRace } from "./race/start.js";
import { finishRace } from "./race/finish.js";
import { recordLap } from "./lap-record.js";

describe("recordLap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T12:00:00.000Z"));
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

  it("increments laps for the given car", () => {
    const running = makeRunningStateWithCars([1, 2]);

    const next = recordLap(running, 2);

    const d2 = next.sessions.current.drivers.find((d) => d.car === 2);
    expect(d2.laps).toBe(1);
  });

  it("sets lastLapAt on first lap and does not set fastestLap yet", () => {
    const running = makeRunningStateWithCars([1]);

    const next = recordLap(running, 1);

    const d1 = next.sessions.current.drivers.find((d) => d.car === 1);
    expect(d1.lastLapAt).toBe(Date.now());
    expect(d1.fastestLap).toBeNull();
  });

  it("computes lap time on second lap and sets fastestLap", () => {
    const running = makeRunningStateWithCars([1]);

    const afterFirst = recordLap(running, 1);

    vi.setSystemTime(new Date("2026-01-10T12:00:10.000Z")); // +10s
    const afterSecond = recordLap(afterFirst, 1);

    const d1 = afterSecond.sessions.current.drivers.find((d) => d.car === 1);
    expect(d1.laps).toBe(2);
    expect(d1.fastestLap).toBe(10_000);
  });

  it("updates fastestLap only if the new lap is faster", () => {
    const running = makeRunningStateWithCars([1]);

    const s1 = recordLap(running, 1);

    vi.setSystemTime(new Date("2026-01-10T12:00:12.000Z")); // 12s lap
    const s2 = recordLap(s1, 1);

    vi.setSystemTime(new Date("2026-01-10T12:00:25.000Z")); // 13s lap (slower)
    const s3 = recordLap(s2, 1);

    const d1 = s3.sessions.current.drivers.find((d) => d.car === 1);
    expect(d1.fastestLap).toBe(12_000);
  });

  it("allows recording laps when race is finished (finish mode) but not ended session", () => {
    const running = makeRunningStateWithCars([1]);

    const finished = finishRace(running); // timer.status -> ended, mode -> finish

    const next = recordLap(finished, 1);

    const d1 = next.sessions.current.drivers.find((d) => d.car === 1);
    expect(d1.laps).toBe(1);
  });

  it("throws if there is no current session", () => {
    const state = createInitialState();
    state.timer.status = "running";

    expect(() => recordLap(state, 1)).toThrow();
  });

  it("throws if timer is idle (race not started)", () => {
    const state = createInitialState();
    state.sessions.current = {
      id: "s1",
      drivers: [{ car: 1, laps: 0, lastLapAt: null, fastestLap: null }],
    };

    expect(() => recordLap(state, 1)).toThrow();
  });

  it("throws if car is not part of current session", () => {
    const running = makeRunningStateWithCars([1, 2]);

    expect(() => recordLap(running, 99)).toThrow();
  });

  it("does not mutate original state", () => {
    const running = makeRunningStateWithCars([1]);

    const next = recordLap(running, 1);

    expect(next).not.toBe(running);

    const before = running.sessions.current.drivers.find((d) => d.car === 1);
    const after = next.sessions.current.drivers.find((d) => d.car === 1);

    expect(before.laps).toBe(0);
    expect(after.laps).toBe(1);
  });
});
