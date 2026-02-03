import { describe, test, expect, afterEach, beforeEach } from "vitest";
import { __resetForTests } from "../../src/runtime/store.js";
import { EVENTS } from "../../src/sockets/events.js";
import {
    RECEPTIONIST_KEY,
    SAFETY_KEY,
    OBSERVER_KEY,
} from "../../src/security/global-key-control.js";

import {
    createIoTestServer,
    connectClient,
    emitCmd,
    waitForState,
    latestState,
    onceConnect,
} from "./_helpers.js";

beforeEach(() => {
    __resetForTests();
});

function driver(car, name = `D${car}`) {
    return {
        name,
        car,
        laps: 0,
        lastLapAt: null,
        fastestLap: null,
    };
}

describe("network mini-tests (stable)", () => {
    let srv;
    let clients = [];

    async function boot() {
        srv = await createIoTestServer();
        clients = [];
        return srv;
    }

    async function connect(role, key) {
        const c = connectClient({ port: srv.port, role, key });
        clients.push(c);
        await onceConnect(c.socket);
        return c;
    }

    async function mustOk(promiseAck) {
        const ack = await promiseAck;
        if (!ack?.ok) {
            throw new Error(`CMD rejected: ${JSON.stringify(ack)}`);
        }
        return ack;
    }

    afterEach(async () => {
        for (const c of clients) {
            try {
                await c.close();
            } catch (_) {}
        }
        clients = [];

        if (srv) {
            await srv.close();
            srv = null;
        }
    });

    test("A) front-desk add session -> observer sees it in upcoming", async () => {
        await boot();

        const observer = await connect("lap-line-tracker", OBSERVER_KEY);
        const receptionist = await connect("front-desk", RECEPTIONIST_KEY);

        await waitForState(observer, (s) => !!s && !!s.sessions, 2000);

        const sessionId = "S1";

        await mustOk(
            emitCmd(receptionist.socket, EVENTS.CMD.SESSION_ADD, {
                session: { id: sessionId, drivers: [driver(1)] },
            }),
        );

        const seen = await waitForState(
            observer,
            (s) =>
                Array.isArray(s.sessions.upcoming) &&
                s.sessions.upcoming.some((x) => x.id === sessionId),
            2000,
        );

        expect(seen.sessions.upcoming.some((x) => x.id === sessionId)).toBe(
            true,
        );
    });

    test("B) race-control start -> current set + timer running", async () => {
        await boot();

        const observer = await connect("lap-line-tracker", OBSERVER_KEY);
        const receptionist = await connect("front-desk", RECEPTIONIST_KEY);
        const safety = await connect("race-control", SAFETY_KEY);

        await waitForState(observer, (s) => !!s && !!s.sessions, 2000);

        const sessionId = "S1";

        await mustOk(
            emitCmd(receptionist.socket, EVENTS.CMD.SESSION_ADD, {
                session: { id: sessionId, drivers: [driver(1)] },
            }),
        );

        await waitForState(
            observer,
            (s) => s.sessions.upcoming.some((x) => x.id === sessionId),
            2000,
        );

        const durationSec = 60;

        await mustOk(
            emitCmd(safety.socket, EVENTS.CMD.RACE_START, { durationSec }),
        );

        const running = await waitForState(
            observer,
            (s) =>
                s.sessions.current?.id === sessionId &&
                s.timer.status === "running" &&
                typeof s.timer.startedAt === "number" &&
                typeof s.timer.endsAt === "number",
            2000,
        );

        expect(running.sessions.current.id).toBe(sessionId);
        expect(running.timer.status).toBe("running");
        expect(running.timer.durationSec).toBe(durationSec);
        expect(running.timer.endsAt).toBeGreaterThan(running.timer.startedAt);
    });

    test("C) race finish flow is robust: after end -> lastResult set; current is next OR null", async () => {
        await boot();

        const observer = await connect("lap-line-tracker", OBSERVER_KEY);
        const receptionist = await connect("front-desk", RECEPTIONIST_KEY);
        const safety = await connect("race-control", SAFETY_KEY);

        await waitForState(observer, (s) => !!s && !!s.sessions, 2000);

        await mustOk(
            emitCmd(receptionist.socket, EVENTS.CMD.SESSION_ADD, {
                session: { id: "S1", drivers: [driver(1)] },
            }),
        );
        await mustOk(
            emitCmd(receptionist.socket, EVENTS.CMD.SESSION_ADD, {
                session: { id: "S2", drivers: [driver(2)] },
            }),
        );

        await waitForState(
            observer,
            (s) =>
                s.sessions.upcoming.some((x) => x.id === "S1") &&
                s.sessions.upcoming.some((x) => x.id === "S2"),
            2000,
        );

        const durationSec = 1;

        await mustOk(
            emitCmd(safety.socket, EVENTS.CMD.RACE_START, { durationSec }),
        );

        const started = await waitForState(
            observer,
            (s) =>
                s.sessions.current?.id === "S1" &&
                s.timer.status === "running" &&
                typeof s.timer.endsAt === "number",
            2000,
        );

        const endsAt = started.timer.endsAt;

        // Deterministic finish: drive orchestration directly
        srv.tick(endsAt + 1);

        const finished = await waitForState(
            observer,
            (s) => s.sessions.lastResult?.id === "S1",
            2000,
        );

        expect(finished.sessions.lastResult.id).toBe("S1");

        const currentId = finished.sessions.current?.id || null;
        expect([null, "S2"]).toContain(currentId);

        const last = latestState(observer);
        expect(last.sessions.lastResult?.id).toBe("S1");
        expect([null, "S2"]).toContain(last.sessions.current?.id || null);
    });
});
