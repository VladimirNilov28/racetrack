import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { addSession } from "./add.js";

function makeSession(id, drivers = []) {
  return { id, drivers };
}

describe("session/add", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a session to sessions.upcoming (append)", () => {
    const base = createInitialState();
    const s1 = makeSession("S1");
    const s2 = makeSession("S2");

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        upcoming: [s1],
      },
    };

    const result = addSession(state, s2);

    expect(result).not.toBe(state);
    expect(result.sessions.upcoming).toEqual([s1, s2]);
  });

  it("updates meta.updatedAt", () => {
    const base = createInitialState();
    const session = makeSession("S1");

    const result = addSession(base, session);

    expect(result.meta.updatedAt).toBe(Date.now());
  });

  it("does not mutate original state (immutability)", () => {
    const base = createInitialState();
    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        upcoming: [makeSession("S1")],
      },
    };

    const snapshot = structuredClone(state);
    const result = addSession(state, makeSession("S2"));

    expect(state).toEqual(snapshot);
    expect(result.sessions).not.toBe(state.sessions);
    expect(result.sessions.upcoming).not.toBe(state.sessions.upcoming);
    expect(result.meta).not.toBe(state.meta);
  });

  it("throws if session id already exists in upcoming", () => {
    const base = createInitialState();
    const s1 = makeSession("S1");

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        upcoming: [s1],
      },
    };

    expect(() => addSession(state, makeSession("S1"))).toThrow(/id/i);
  });

  it("throws if session id equals current session id", () => {
    const base = createInitialState();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: makeSession("S1"),
        upcoming: [],
      },
    };

    expect(() => addSession(state, makeSession("S1"))).toThrow(/id/i);
  });

  it("throws if session id equals lastResult session id", () => {
    const base = createInitialState();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        lastResult: makeSession("S1"),
        upcoming: [],
      },
    };

    expect(() => addSession(state, makeSession("S1"))).toThrow(/id/i);
  });

  it("throws if session is missing required fields", () => {
    const base = createInitialState();

    expect(() => addSession(base, null)).toThrow();
    expect(() => addSession(base, {})).toThrow();
    expect(() => addSession(base, { id: "S1" })).toThrow(/drivers/i);
    expect(() => addSession(base, { drivers: [] })).toThrow(/id/i);
  });

  it("allows adding a session with empty drivers list", () => {
    const base = createInitialState();

    const result = addSession(base, makeSession("S1", []));

    expect(result.sessions.upcoming).toEqual([makeSession("S1", [])]);
  });
});
