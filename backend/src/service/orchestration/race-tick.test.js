import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { raceTick } from "./race-tick.js";
import { finishRace } from "../race/finish.js";

describe("orchestration/race-tick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same state (same reference) if timer.status is idle", () => {
    const state = createInitialState();

    const result = raceTick(state, Date.now());

    expect(result).toBe(state);
  });

  it("returns the same state (same reference) if timer.status is ended", () => {
    const base = createInitialState();
    const state = {
      ...base,
      timer: {
        status: "ended",
        startedAt: 100,
        endsAt: 200,
        durationSec: 1,
      },
    };

    const result = raceTick(state, Date.now());

    expect(result).toBe(state);
  });

  it("returns the same state (same reference) if timer is running but now < endsAt", () => {
    const base = createInitialState();
    const now = Date.now();

    const state = {
      ...base,
      timer: {
        status: "running",
        startedAt: now - 1000,
        endsAt: now + 5000,
        durationSec: 10,
      },
      race: {
        ...base.race,
        mode: { value: "safe", updatedAt: now - 1000 },
      },
    };

    const result = raceTick(state, now);

    expect(result).toBe(state);
  });

  it("when now >= endsAt: returns exactly what finishRace(state) returns", () => {
    const base = createInitialState();
    const now = Date.now();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: { id: "S1", drivers: [] },
      },
      race: {
        ...base.race,
        mode: { value: "safe", updatedAt: now - 1000 },
      },
      timer: {
        status: "running",
        startedAt: now - 5000,
        endsAt: now, // boundary
        durationSec: 5,
      },
    };

    // Expected behavior: tick delegates to domain brick
    const expected = finishRace(state);
    const result = raceTick(state, now);

    expect(result).toEqual(expected);

    // and it actually changed something
    expect(result).not.toBe(state);
  });

  it("does not mutate original state when it triggers finishing", () => {
    const base = createInitialState();
    const now = Date.now();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: { id: "S1", drivers: [] },
      },
      race: {
        ...base.race,
        mode: { value: "safe", updatedAt: now - 1000 },
      },
      timer: {
        status: "running",
        startedAt: now - 5000,
        endsAt: now,
        durationSec: 5,
      },
    };

    const snapshot = structuredClone(state);
    const result = raceTick(state, now);

    expect(state).toEqual(snapshot);
    expect(result).not.toBe(state);
  });
});
