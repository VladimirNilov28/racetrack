import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { endSession } from "./end.js";

function makeSession(id, drivers = []) {
  return { id, drivers };
}

describe("session/end", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws if there is no current session", () => {
    const state = createInitialState();
    expect(() => endSession(state)).toThrow(/current session/i);
  });

  it("throws if race mode is not 'finish'", () => {
    const base = createInitialState();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: makeSession("S1"),
      },
      race: { mode: { value: "safe", updatedAt: null } },
    };

    expect(() => endSession(state)).toThrow(/finish/i);
  });

  it("moves current session to lastResult and clears current", () => {
    const base = createInitialState();
    const current = makeSession("S1");

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current,
        lastResult: null,
      },
      race: { mode: { value: "finish", updatedAt: null } },
      timer: {
        status: "ended",
        startedAt: 1,
        endsAt: 2,
        durationSec: 600,
      },
    };

    const result = endSession(state);
    const now = Date.now();

    expect(result.sessions.lastResult).toEqual(current);
    expect(result.sessions.current).toBe(null);

    expect(result.timer).toEqual({
      status: "idle",
      startedAt: null,
      endsAt: null,
      durationSec: null,
    });

    expect(result.meta.updatedAt).toBe(now);
  });

  it.skip("does not touch upcoming sessions", () => {
    const base = createInitialState();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: makeSession("S1"),
        upcoming: [makeSession("S2"), makeSession("S3")],
      },
      race: { mode: { value: "finish", updatedAt: null } },
      timer: { status: "ended", startedAt: 1, endsAt: 2, durationSec: 600 },
    };

    const result = endSession(state);

    expect(result.sessions.upcoming).toEqual(state.sessions.upcoming);
  });

  it("is fully immutable", () => {
    const base = createInitialState();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: makeSession("S1"),
      },
      race: { mode: { value: "finish", updatedAt: null } },
      timer: { status: "ended", startedAt: 1, endsAt: 2, durationSec: 600 },
    };

    const snapshot = structuredClone(state);
    const result = endSession(state);

    expect(state).toEqual(snapshot);
    expect(result.sessions).not.toBe(state.sessions);
    expect(result.timer).not.toBe(state.timer);
    expect(result.meta).not.toBe(state.meta);
  });
});
