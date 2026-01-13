import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { raceTick } from "./race-tick.js";

describe("orchestration/race-tick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same state if timer.status is idle", () => {
    const state = createInitialState();
    const result = raceTick(state, Date.now());

    expect(result).toBe(state);
  });

  it("returns the same state if timer.status is ended", () => {
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

  it("returns the same state if timer is running but now < endsAt", () => {
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
        mode: { value: "safe", updatedAt: now - 1000 },
      },
    };

    const result = raceTick(state, now);

    expect(result).toBe(state);
  });

  it("finishes the race when timer is running and now >= endsAt", () => {
    const base = createInitialState();
    const now = Date.now();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: { id: "S1", drivers: [] },
      },
      race: {
        mode: { value: "safe", updatedAt: now - 1000 },
      },
      timer: {
        status: "running",
        startedAt: now - 5000,
        endsAt: now, // boundary
        durationSec: 5,
      },
    };

    const result = raceTick(state, now);

    // should transition to finish
    expect(result).not.toBe(state);
    expect(result.race.mode.value).toBe("finish");

    // timer should no longer be running (finishRace likely sets ended)
    expect(result.timer.status).toBe("ended");
  });

  it("is immutable when it changes state", () => {
    const base = createInitialState();
    const now = Date.now();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: { id: "S1", drivers: [] },
      },
      race: {
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
