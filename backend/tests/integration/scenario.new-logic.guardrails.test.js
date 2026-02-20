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
    return { name, car, laps: 0, lastLapAt: null, fastestLap: null };
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

describe("scenario (new logic): finish lock + explicit endSession + guardrails", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("covers tricky cases and invariants end-to-end", () => {
        // ----------------------------
        // 0) Fresh boot invariants
        // ----------------------------
        let state = createInitialState();
        expect(state.race.mode.value).toBe("danger");

        // Cannot record lap when there is no current session
        expect(() => recordLap(state, 7)).toThrow(
            /no current|no active|session/i,
        );

        // Cannot end session when nothing is running / not finished
        expect(() => endSession(state)).toThrow(/no current|finish/i);

        // Cannot start race if there are no sessions at all
        expect(() => startRace(state, 10)).toThrow(
            /upcoming|no .*session|start/i,
        );

        // ----------------------------
        // 1) Setup: 2 sessions, drivers
        // ----------------------------
        state = addSession(state, makeSession("S1"));
        state = addDriver(state, "S1", makeDriver("Alice", 7));
        state = addDriver(state, "S1", makeDriver("Bob", 12));

        state = addSession(state, makeSession("S2"));
        state = addDriver(state, "S2", makeDriver("Charlie", 3));

        expect(state.sessions.current).toBe(null);
        expect(state.sessions.upcoming.map((s) => s.id)).toEqual(["S1", "S2"]);

        // ----------------------------
        // 2) Start race S1
        // ----------------------------
        const beforeStart = deepClone(state);

        const started = startRace(state, 30);
        expect(started).not.toBe(state); // immutability smoke
        expect(state).toEqual(beforeStart); // original unchanged (cheap deep check)

        state = started;

        expect(state.sessions.current?.id).toBe("S1");
        expect(state.sessions.upcoming.map((s) => s.id)).toEqual(["S2"]);
        expect(state.timer.status).toBe("running");
        expect(state.race.mode.value).toBe("safe");

        // Optional guardrail: starting again while already running should throw.
        // If your startRace intentionally allows restarting, comment this out.
        // expect(() => startRace(state, 10)).toThrow(
        //     /running|current|active|already|started/i,
        // );

        // Cannot record lap for a car that is not in current session
        expect(() => recordLap(state, 999)).toThrow(/car|not part|current/i);

        // ----------------------------
        // 3) Record laps + time rules
        // ----------------------------
        // First lap
        vi.setSystemTime(Date.now() + 1000);
        const afterLap1 = recordLap(state, 7);
        expect(afterLap1).not.toBe(state); // immutability smoke
        state = afterLap1;

        const d7a = state.sessions.current.drivers.find((d) => d.car === 7);
        expect(d7a.laps).toBe(1);

        // Second lap (ensures lap-time logic doesn't crash)
        vi.setSystemTime(Date.now() + 1200);
        state = recordLap(state, 7);
        const d7b = state.sessions.current.drivers.find((d) => d.car === 7);
        expect(d7b.laps).toBe(2);

        // ----------------------------
        // 4) Finish: must NOT end session
        // ----------------------------
        const snapBeforeFinish = deepClone(state);
        const finished1 = finishRace(state);

        expect(finished1).not.toBe(state);
        expect(state).toEqual(snapBeforeFinish); // original not mutated (cheap deep check)

        state = finished1;

        expect(state.race.mode.value).toBe("finish");
        expect(state.timer.status).toBe("ended");

        // Finish must keep current visible (does not end session)
        expect(state.sessions.current?.id).toBe("S1");
        expect(state.sessions.lastResult?.id).toBe("S1");
        expect(state.sessions.upcoming.map((s) => s.id)).toEqual(["S2"]);

        // Finish should be idempotent (second finish shouldn't break)
        const finished2 = finishRace(state);
        expect(finished2.race.mode.value).toBe("finish");
        expect(finished2.timer.status).toBe("ended");

        // Mode is locked after finish
        expect(() => setRaceMode(state, "danger")).toThrow(/locked|finish/i);

        // No more laps after finish
        expect(() => recordLap(state, 7)).toThrow(
            /finish|ended|idle|not started|no active/i,
        );

        // ----------------------------
        // 5) End session: explicit transition to danger + queue advance
        // ----------------------------
        const beforeEnd = deepClone(state);
        const ended = endSession(state);

        expect(ended).not.toBe(state);
        expect(state).toEqual(beforeEnd);

        state = ended;

        // After endSession: danger, idle, lastResult persists, next becomes current
        expect(state.race.mode.value).toBe("danger");
        expect(state.timer.status).toBe("idle");
        expect(state.sessions.lastResult?.id).toBe("S1");
        expect(state.sessions.current?.id).toBe("S2");
        expect(state.sessions.upcoming).toEqual([]);

        // Cannot set mode after end? (depends on your rules)
        // If you want to allow mode changes in danger, keep this as "does not throw".
        expect(() => setRaceMode(state, "hazard")).not.toThrow();

        // No laps when timer is idle (race not started)
        expect(() => recordLap(state, 3)).toThrow(
            /idle|not started|no active/i,
        );

        // Cannot end session again unless you're in finish (should throw)
        expect(() => endSession(state)).toThrow(/finish|not finished|current/i);

        // ----------------------------
        // 6) Start race for S2: should work normally
        // ----------------------------
        state = startRace(state, 15);
        expect(state.sessions.current?.id).toBe("S2");
        expect(state.timer.status).toBe("running");
        expect(state.race.mode.value).toBe("safe");

        // Smoke: record lap for S2 driver
        vi.setSystemTime(Date.now() + 1000);
        state = recordLap(state, 3);
        const d3 = state.sessions.current.drivers.find((d) => d.car === 3);
        expect(d3.laps).toBe(1);
    });
});
