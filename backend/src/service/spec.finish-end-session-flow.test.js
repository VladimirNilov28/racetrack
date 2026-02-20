import { describe, it, expect, vi } from "vitest";

import { createInitialState } from "./state-init.js";
import { raceTick } from "./orchestration/race-tick.js";
import { finishRace } from "./race/finish.js";
import { endSession } from "./session/end.js";

describe("spec: Finish does NOT end session; End Session is explicit", () => {
    it("timer reaches zero -> finish locks state but keeps current; endSession -> danger + promotes next to current", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-08T10:00:00.000Z"));

        const base = createInitialState();
        const t0 = Date.now();

        // Arrange: current session exists, next session is upcoming, race is running
        const running = {
            ...base,
            race: {
                ...base.race,
                mode: { value: "safe", updatedAt: t0 },
                autoStartNext: false, // irrelevant for this spec test
            },
            sessions: {
                ...base.sessions,
                current: { id: "S1", drivers: [] },
                upcoming: [{ id: "S2", drivers: [] }],
                lastResult: null,
            },
            timer: {
                status: "running",
                startedAt: t0 - 5_000,
                endsAt: t0 + 2_000, // ends in 2s
                durationSec: 7,
            },
            meta: {
                ...base.meta,
                updatedAt: t0,
            },
        };

        // Act: move time beyond endsAt and run time-based transition
        const nowAfterEnd = running.timer.endsAt + 1;
        vi.setSystemTime(nowAfterEnd);

        const afterTick = raceTick(running, nowAfterEnd);

        // Assert: finished state, BUT current session is still the same
        expect(afterTick.race.mode.value).toBe("finish");
        expect(afterTick.timer.status).toBe("ended");
        expect(afterTick.sessions.current?.id).toBe("S1");
        expect(afterTick.sessions.lastResult?.id).toBe("S1");
        expect(afterTick.sessions.upcoming.map((s) => s.id)).toEqual(["S2"]);

        // Act: explicit End Session (cars returned to pit lane)
        const afterEndSession = endSession(afterTick);

        // Assert: system returns to danger, timer idle, next session becomes current
        expect(afterEndSession.race.mode.value).toBe("danger");
        expect(afterEndSession.timer.status).toBe("idle");
        expect(afterEndSession.sessions.lastResult?.id).toBe("S1");
        expect(afterEndSession.sessions.current?.id).toBe("S2");
        expect(afterEndSession.sessions.upcoming).toEqual([]);

        vi.useRealTimers();
    });

    it("manual Finish command also does NOT end session; End Session still required", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-02-08T10:00:00.000Z"));

        const base = createInitialState();
        const t0 = Date.now();

        const running = {
            ...base,
            race: { ...base.race, mode: { value: "safe", updatedAt: t0 } },
            sessions: {
                ...base.sessions,
                current: { id: "S1", drivers: [] },
                upcoming: [{ id: "S2", drivers: [] }],
                lastResult: null,
            },
            timer: {
                status: "running",
                startedAt: t0 - 1_000,
                endsAt: t0 + 60_000,
                durationSec: 60,
            },
            meta: { ...base.meta, updatedAt: t0 },
        };

        // Act: manual finish
        const finished = finishRace(running);

        // Assert: finish stops timer and sets lastResult, but keeps current
        expect(finished.race.mode.value).toBe("finish");
        expect(finished.timer.status).toBe("ended");
        expect(finished.sessions.current?.id).toBe("S1");
        expect(finished.sessions.lastResult?.id).toBe("S1");
        expect(finished.sessions.upcoming.map((s) => s.id)).toEqual(["S2"]);

        // Act: end session explicitly
        const afterEndSession = endSession(finished);

        // Assert
        expect(afterEndSession.race.mode.value).toBe("danger");
        expect(afterEndSession.timer.status).toBe("idle");
        expect(afterEndSession.sessions.current?.id).toBe("S2");

        vi.useRealTimers();
    });
});
