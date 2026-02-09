import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { createInitialState } from "../../src/service/state-init.js";

import { addSession } from "../../src/service/session/add.js";
import { addDriver } from "../../src/service/driver/add.js";

import { startRace } from "../../src/service/race/start.js";
import { recordLap } from "../../src/service/lap-record.js";

import { raceTick } from "../../src/service/orchestration/race-tick.js";
import { raceRun } from "../../src/service/orchestration/race-run.js";

function makeSession(id) {
  return { id, drivers: [] };
}

function makeDriver(name, car) {
  return { name, car };
}

describe.skip("scenario: race lifecycle (2 sessions back-to-back)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs 2 races in a row: laps recorded -> timer ends -> session ends -> next starts", () => {
    let state = createInitialState();

    // 1) Queue two sessions
    state = addSession(state, makeSession("S1"));
    state = addSession(state, makeSession("S2"));

    // 2) Add drivers to S1
    state = addDriver(state, "S1", makeDriver("Alice", 7));
    state = addDriver(state, "S1", makeDriver("Bob", 12));

    // 3) Add drivers to S2
    state = addDriver(state, "S2", makeDriver("Carol", 21));
    state = addDriver(state, "S2", makeDriver("Dan", 33));

    // 4) Start first race (duration 10s for fast scenario)
    state = startRace(state, 10);

    expect(state.sessions.current?.id).toBe("S1");
    expect(state.timer.status).toBe("running");

    // ---- Race 1: record laps with fake time
    // First lap for car 7
    vi.setSystemTime(Date.now() + 1000);
    state = recordLap(state, 7);

    // Second lap for car 7 => fastestLap becomes 2000ms (if your logic uses now-lastLapAt)
    vi.setSystemTime(Date.now() + 2000);
    state = recordLap(state, 7);

    // One lap for car 12
    vi.setSystemTime(Date.now() + 500);
    state = recordLap(state, 12);

    // Sanity: laps updated
    const s1BeforeFinish = state.sessions.current;
    expect(s1BeforeFinish.drivers.find(d => d.car === 7).laps).toBe(2);
    expect(s1BeforeFinish.drivers.find(d => d.car === 7).fastestLap).not.toBe(null);

    // 5) Advance time to end of timer -> tick -> run
    vi.setSystemTime(state.timer.endsAt); // jump to end
    state = raceTick(state, Date.now());
    state = raceRun(state, { durationSec: 10 });

    // After run: S1 should be stored in lastResult, S2 should become current
    expect(state.sessions.lastResult?.id).toBe("S1");
    expect(state.sessions.current?.id).toBe("S2");
    expect(state.timer.status).toBe("running");

    // Result correctness: lastResult contains updated laps for S1 driver 7
    const s1Result = state.sessions.lastResult;
    expect(s1Result.drivers.find(d => d.car === 7).laps).toBe(2);

    // ---- Race 2: record laps
    vi.setSystemTime(Date.now() + 1000);
    state = recordLap(state, 21);
    vi.setSystemTime(Date.now() + 1500);
    state = recordLap(state, 21);

    // Finish second race
    vi.setSystemTime(state.timer.endsAt);
    state = raceTick(state, Date.now());
    state = raceRun(state, { durationSec: 10 });

    // End state: no upcoming => current should be null, lastResult should be S2
    expect(state.sessions.current).toBe(null);
    expect(state.sessions.lastResult?.id).toBe("S2");
    expect(state.timer.status).toBe("idle");
    expect(state.race.mode.value).toBe("safe");

    // lastResult correctness: driver 21 has 2 laps
    expect(state.sessions.lastResult.drivers.find(d => d.car === 21).laps).toBe(2);
  });
});
