import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createInitialState } from "../../src/service/state-init.js";

import { addSession } from "../../src/service/session/add.js";
import { removeSession } from "../../src/service/session/remove.js"; // optional if exists
import { endSession } from "../../src/service/session/end.js";

import { addDriver } from "../../src/service/driver/add.js";
import { editDriver } from "../../src/service/driver/edit.js";
import { removeDriver } from "../../src/service/driver/remove.js"; // optional if exists

import { startRace } from "../../src/service/race/start.js";
import { setRaceMode } from "../../src/service/race/set-mode.js";
import { finishRace } from "../../src/service/race/finish.js";

import { recordLap } from "../../src/service/lap-record.js";

import { raceTick } from "../../src/service/orchestration/race-tick.js";
import { raceRun } from "../../src/service/orchestration/race-run.js";

function makeSession(id) {
  return { id, drivers: [] };
}
function makeDriver(name, car) {
  return { name, car };
}

describe("MEGA scenario: lifecycle + guardrails + invariants", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs 2 races back-to-back and enforces key invariants", () => {
    let state = createInitialState();

    // -----------------------------
    // Setup: queue 2 sessions
    // -----------------------------
    state = addSession(state, makeSession("S1"));
    state = addSession(state, makeSession("S2"));

    // Add drivers to sessions
    state = addDriver(state, "S1", makeDriver("Alice", 7));
    state = addDriver(state, "S1", makeDriver("Bob", 12));

    state = addDriver(state, "S2", makeDriver("Carol", 21));
    state = addDriver(state, "S2", makeDriver("Dan", 33));

    // Car conflict guard (upcoming): cannot change 7 -> 12
    expect(() => editDriver(state, "S1", 7, { car: 12 })).toThrow(/car|exists|duplicate|unique/i);

    // -----------------------------
    // Start race 1
    // -----------------------------
    state = startRace(state, 10);
    expect(state.sessions.current?.id).toBe("S1");
    expect(state.timer.status).toBe("running");

    // Guard rail: cannot start again while current exists (should throw)
    // If your startRace doesn't have this guard yet, this will fail and tells you to add it.
    expect(() => startRace(state, 10)).toThrow(/current|active|already|started/i);

    // (Optional rule) roster locked after start:
    // expect(() => addDriver(state, "S1", makeDriver("LateGuy", 99))).toThrow(/current|running|started|locked/i);
    // expect(() => editDriver(state, "S1", 7, { name: "Alice2" })).toThrow(/current|running|started|locked/i);

    // Laps (realistic car numbers)
    vi.setSystemTime(Date.now() + 1000);
    state = recordLap(state, 7); // lap 1

    vi.setSystemTime(Date.now() + 2000);
    state = recordLap(state, 7); // lap 2 => fastestLap set

    vi.setSystemTime(Date.now() + 500);
    state = recordLap(state, 12); // lap 1

    // Sanity: S1 stats updated
    const s1Live = state.sessions.current;
    expect(s1Live.drivers.find(d => d.car === 7).laps).toBe(2);
    expect(s1Live.drivers.find(d => d.car === 7).fastestLap).not.toBe(null);

    // -----------------------------
    // Finish via time: tick -> run
    // -----------------------------
    vi.setSystemTime(state.timer.endsAt);
    state = raceTick(state, Date.now());
    state = raceRun(state, { durationSec: 10 });

    // After run: lastResult = S1, current = S2
    expect(state.sessions.lastResult?.id).toBe("S1");
    expect(state.sessions.current?.id).toBe("S2");
    expect(state.timer.status).toBe("running");
    expect(state.race.mode.value).toBe("safe");

    // Result preserved in lastResult
    const s1Result = state.sessions.lastResult;
    expect(s1Result.drivers.find(d => d.car === 7).laps).toBe(2);

    // -----------------------------
    // Race 2 (manual finish + lock)
    // -----------------------------
    vi.setSystemTime(Date.now() + 1000);
    state = recordLap(state, 21);
    vi.setSystemTime(Date.now() + 1500);
    state = recordLap(state, 21);

    // Manual finish now
    state = finishRace(state);
    expect(state.race.mode.value).toBe("finish");
    expect(state.timer.status).toBe("ended");

    // Mode lock after finish
    const afterDanger = setRaceMode(state, "danger");
    expect(afterDanger.race.mode.value).toBe("finish");

    // No laps after finish
    expect(() => recordLap(state, 21)).toThrow(/finish|finished|ended|running|started/i);

    // End session resets to idle/safe and moves current -> lastResult
    state = endSession(state);
    expect(state.sessions.current).toBe(null);
    expect(state.sessions.lastResult?.id).toBe("S2");
    expect(state.timer.status).toBe("idle");
    expect(state.race.mode.value).toBe("safe");

    // No laps after end (no current)
    expect(() => recordLap(state, 21)).toThrow(/no active|current/i);
  });
});
