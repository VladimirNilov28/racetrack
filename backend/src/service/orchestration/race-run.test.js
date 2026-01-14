import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInitialState } from "../state-init.js";
import { raceRun } from "./race-run.js";

function makeSession(id, drivers = []) {
  return { id, drivers };
}

describe("orchestration/race-run", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the same state if race.mode is not finish", () => {
    const base = createInitialState();
    const state = {
      ...base,
      race: { mode: { value: "safe", updatedAt: null } },
    };

    const result = raceRun(state, { durationSec: 60, now: Date.now() });

    expect(result).toBe(state);
  });

  it("ends current session when race.mode is finish (moves current -> lastResult, current -> null, timer -> idle)", () => {
    const base = createInitialState();
    const now = Date.now();

    const current = makeSession("S1", []);

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current,
        upcoming: [],
        lastResult: null,
      },
      race: { mode: { value: "finish", updatedAt: now - 1000 } },
      timer: { status: "ended", startedAt: 1, endsAt: 2, durationSec: 5 },
    };

    const result = raceRun(state, { durationSec: 60, now });

    expect(result).not.toBe(state);

    expect(result.sessions.lastResult).toEqual(current);
    expect(result.sessions.current).toBe(null);

    expect(result.timer).toEqual({
      status: "idle",
      startedAt: null,
      endsAt: null,
      durationSec: null,
    });
  });

  it("after finish: promotes next upcoming to current, removes it from upcoming, starts race timer, sets mode to safe", () => {
    const base = createInitialState();
    const now = Date.now();

    const current = makeSession("S1", []);
    const next = makeSession("S2", []);

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current,
        upcoming: [next, makeSession("S3")],
        lastResult: null,
      },
      race: { mode: { value: "finish", updatedAt: now - 1000 } },
      timer: { status: "ended", startedAt: 1, endsAt: 2, durationSec: 5 },
    };

    const result = raceRun(state, { durationSec: 60, now });

    // next is promoted
    expect(result.sessions.current).toEqual(next);
    expect(result.sessions.upcoming.map(s => s.id)).toEqual(["S3"]);

    // race restarted
    expect(result.race.mode.value).toBe("safe");

    // timer started (exact timestamps depend on startRace contract)
    expect(result.timer.status).toBe("running");
    expect(result.timer.startedAt).toBe(now);
    expect(result.timer.endsAt).toBe(now + 60 * 1000);
    expect(result.timer.durationSec).toBe(60);
  });

  it("after finish with no upcoming: ends session and leaves system idle (current null, timer idle)", () => {
    const base = createInitialState();
    const now = Date.now();

    const current = makeSession("S1", []);

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current,
        upcoming: [],
        lastResult: null,
      },
      race: { mode: { value: "finish", updatedAt: now - 1000 } },
      timer: { status: "ended", startedAt: 1, endsAt: 2, durationSec: 5 },
    };

    const result = raceRun(state, { durationSec: 60, now });

    expect(result.sessions.current).toBe(null);
    expect(result.timer.status).toBe("idle");
    // mode choice for idle system: we expect "safe" as neutral
    expect(result.race.mode.value).toBe("safe");
  });

  it("is immutable when it changes state", () => {
    const base = createInitialState();
    const now = Date.now();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: makeSession("S1", []),
        upcoming: [makeSession("S2", [])],
        lastResult: null,
      },
      race: { mode: { value: "finish", updatedAt: now - 1000 } },
      timer: { status: "ended", startedAt: 1, endsAt: 2, durationSec: 5 },
    };

    const snapshot = structuredClone(state);
    const result = raceRun(state, { durationSec: 60, now });

    expect(state).toEqual(snapshot);
    expect(result).not.toBe(state);
    expect(result.sessions).not.toBe(state.sessions);
    expect(result.meta).not.toBe(state.meta);
  });

  it("throws if durationSec is missing when it needs to start next session", () => {
    const base = createInitialState();
    const now = Date.now();

    const state = {
      ...base,
      sessions: {
        ...base.sessions,
        current: makeSession("S1", []),
        upcoming: [makeSession("S2", [])],
        lastResult: null,
      },
      race: { mode: { value: "finish", updatedAt: now - 1000 } },
      timer: { status: "ended", startedAt: 1, endsAt: 2, durationSec: 5 },
    };

    expect(() => raceRun(state, { now })).toThrow(/duration/i);
  });
});
