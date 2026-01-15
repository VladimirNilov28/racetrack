import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createInitialState } from "../../src/service/state-init.js";

import { addSession } from "../../src/service/session/add.js";
import { addDriver } from "../../src/service/driver/add.js";

import { startRace } from "../../src/service/race/start.js";
import { recordLap } from "../../src/service/lap-record.js";

import { setRaceMode } from "../../src/service/race/set-mode.js";
import { finishRace } from "../../src/service/race/finish.js";
import { endSession } from "../../src/service/session/end.js";

function makeSession(id) {
  return { id, drivers: [] };
}

function makeDriver(name, car) {
  return { name, car };
}

describe("scenario: manual finish + mode lock + no laps after end", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("finish locks mode, laps are blocked after finish/end, endSession resets system", () => {
    let state = createInitialState();

    // Setup 1 session with 2 drivers
    state = addSession(state, makeSession("S1"));
    state = addDriver(state, "S1", makeDriver("Alice", 7));
    state = addDriver(state, "S1", makeDriver("Bob", 12));

    // Start race
    state = startRace(state, 30);
    expect(state.sessions.current?.id).toBe("S1");
    expect(state.timer.status).toBe("running");

    // Record 1 lap
    vi.setSystemTime(Date.now() + 1000);
    state = recordLap(state, 7);
    expect(state.sessions.current.drivers.find(d => d.car === 7).laps).toBe(1);

    // Manual finish
    state = finishRace(state);
    expect(state.race.mode.value).toBe("finish");
    expect(state.timer.status).toBe("ended");

    // Mode is locked after finish
    const afterSetMode = setRaceMode(state, "danger");
    expect(afterSetMode.race.mode.value).toBe("finish");

    // No more laps after finish
    expect(() => recordLap(state, 7)).toThrow(/finish|ended|not started|no active/i);

    // End session moves current -> lastResult and resets to idle/safe
    state = endSession(state);
    expect(state.sessions.current).toBe(null);
    expect(state.sessions.lastResult?.id).toBe("S1");
    expect(state.timer.status).toBe("idle");
    expect(state.race.mode.value).toBe("safe");

    // No laps after end (no current)
    expect(() => recordLap(state, 7)).toThrow(/no active|current/i);
  });
});
