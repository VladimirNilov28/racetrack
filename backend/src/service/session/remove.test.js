import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { removeSession } from "./remove.js";

function makeSession(id, drivers = []) {
  return { id, drivers };
}

describe("session/remove", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("throws if sessionId is missing", () => {
    const state = createInitialState();

    expect(() => removeSession(state, null)).toThrow(/id/i);
    expect(() => removeSession(state, "")).toThrow(/id/i);
  });

  it("removes a session from upcoming by id", () => {
    const base = createInitialState();

    const s1 = makeSession("S1");
    const s2 = makeSession("S2");
    const s3 = makeSession("S3");

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        upcoming: [s1, s2, s3],
      },
    };

    const result = removeSession(state, "S2");

    expect(result.sessions.upcoming).toEqual([s1, s3]);
  });

  it("updates meta.updatedAt", () => {
    const base = createInitialState();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        upcoming: [makeSession("S1")],
      },
    };

    const result = removeSession(state, "S1");

    expect(result.meta.updatedAt).toBe(Date.now());
  });

  it("does not mutate original state", () => {
    const base = createInitialState();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        upcoming: [makeSession("S1"), makeSession("S2")],
      },
    };

    const snapshot = structuredClone(state);
    const result = removeSession(state, "S1");

    expect(state).toEqual(snapshot);
    expect(result.sessions).not.toBe(state.sessions);
    expect(result.sessions.upcoming).not.toBe(state.sessions.upcoming);
    expect(result.meta).not.toBe(state.meta);
  });

  it("throws if session id is not found in upcoming", () => {
    const base = createInitialState();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        upcoming: [makeSession("S1")],
      },
    };

    expect(() => removeSession(state, "S999")).toThrow(/not found/i);
  });

  it("does not touch current or lastResult", () => {
    const base = createInitialState();

    const current = makeSession("C1");
    const lastResult = makeSession("R1");

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current,
        lastResult,
        upcoming: [makeSession("S1"), makeSession("S2")],
      },
    };

    const result = removeSession(state, "S2");

    expect(result.sessions.current).toEqual(current);
    expect(result.sessions.lastResult).toEqual(lastResult);
  });
});
