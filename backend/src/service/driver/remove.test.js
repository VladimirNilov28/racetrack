import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { removeDriver } from "./remove.js";

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

describe("driver/remove", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws if sessionId is missing", () => {
    const state = createInitialState();
    expect(() => removeDriver(state, null, 1)).toThrow(/session.*id/i);
    expect(() => removeDriver(state, "", 1)).toThrow(/session.*id/i);
  });

  it("throws if carNumber is missing", () => {
    const base = createInitialState();
    const state = {
      ...base,
      sessions: { ...base.sessions, upcoming: [makeSession("S1", [makeDriver({ car: 1 })])] },
    };

    expect(() => removeDriver(state, "S1", null)).toThrow(/car/i);
    expect(() => removeDriver(state, "S1", undefined)).toThrow(/car/i);
  });

  it("does not allow removing drivers from lastResult", () => {
    const base = createInitialState();
    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        lastResult: makeSession("R1", [makeDriver({ car: 1 })]),
      },
    };

    expect(() => removeDriver(state, "R1", 1)).toThrow(/lastresult|not allowed/i);
  });

  it("throws if session is not found in current or upcoming", () => {
    const base = createInitialState();
    const state = {
      ...base,
      sessions: { ...base.sessions, upcoming: [makeSession("S1")] },
    };

    expect(() => removeDriver(state, "S999", 1)).toThrow(/session.*not found/i);
  });

  it("throws if driver is not found by carNumber in target session", () => {
    const base = createInitialState();
    const state = {
      ...base,
      sessions: { ...base.sessions, upcoming: [makeSession("S1", [makeDriver({ car: 1 })])] },
    };

    expect(() => removeDriver(state, "S1", 99)).toThrow(/driver.*not found/i);
  });

  it("removes driver from an upcoming session by carNumber", () => {
    const base = createInitialState();
    const s1 = makeSession("S1", [
      makeDriver({ name: "Alice", car: 7 }),
      makeDriver({ name: "Bob", car: 12 }),
    ]);

    const state = {
      ...base,
      sessions: { ...base.sessions, upcoming: [s1] },
    };

    const result = removeDriver(state, "S1", 7);
    const updated = result.sessions.upcoming.find(s => s.id === "S1");

    expect(updated.drivers.map(d => d.car)).toEqual([12]);
  });

  it("removes driver from the current session by carNumber", () => {
    const base = createInitialState();
    const current = makeSession("CUR", [
      makeDriver({ name: "Alice", car: 7 }),
      makeDriver({ name: "Bob", car: 12 }),
    ]);

    const state = { ...base, sessions: { ...base.sessions, current } };

    const result = removeDriver(state, "CUR", 12);

    expect(result.sessions.current.drivers.map(d => d.car)).toEqual([7]);
  });

  it("updates meta.updatedAt", () => {
    const base = createInitialState();
    const state = {
      ...base,
      sessions: { ...base.sessions, upcoming: [makeSession("S1", [makeDriver({ car: 7 })])] },
    };

    const result = removeDriver(state, "S1", 7);
    expect(result.meta.updatedAt).toBe(Date.now());
  });

  it("does not mutate original state (immutability smoke test)", () => {
    const base = createInitialState();
    const s1 = makeSession("S1", [
      makeDriver({ name: "Alice", car: 7 }),
      makeDriver({ name: "Bob", car: 12 }),
    ]);

    const state = {
      ...base,
      sessions: { ...base.sessions, upcoming: [s1] },
    };

    const snapshot = structuredClone(state);
    const result = removeDriver(state, "S1", 7);

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
