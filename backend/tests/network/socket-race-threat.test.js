import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import http from "node:http";
import { Server } from "socket.io";
import { io as ioc } from "socket.io-client";
import wildcard from "socketio-wildcard";

function emitCmd(socket, eventName, payload) {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (ack) => resolve(ack));
    });
}

/**
 * Waits for an event while DRIVING fake timers forward.
 * This avoids hangs when vi.useFakeTimers() is enabled.
 */
async function waitForEventDriven(
    socket,
    eventName,
    predicate,
    { timeoutMs = 2000, stepMs = 20 } = {},
) {
    let lastPayload = null;

    const done = new Promise((resolve, reject) => {
        function onEvent(payload) {
            lastPayload = payload;
            try {
                if (!predicate || predicate(payload)) {
                    cleanup();
                    resolve(payload);
                }
            } catch (err) {
                cleanup();
                reject(err);
            }
        }

        function cleanup() {
            socket.off(eventName, onEvent);
        }

        socket.on(eventName, onEvent);
    });

    const startedAt = Date.now();

    // Drive fake time forward until done or timeout
    while (Date.now() - startedAt <= timeoutMs) {
        const res = await Promise.race([
            done
                .then((v) => ({ ok: true, v }))
                .catch((e) => ({ ok: false, e })),
            (async () => {
                await vi.advanceTimersByTimeAsync(stepMs);
                return { ok: null };
            })(),
        ]);

        if (res.ok === true) return res.v;
        if (res.ok === false) throw res.e;
    }

    throw new Error(
        `Timeout waiting for ${eventName}. Last payload: ${JSON.stringify(lastPayload)}`,
    );
}

async function onceEventDriven(
    socket,
    eventName,
    { timeoutMs = 2000, stepMs = 20 } = {},
) {
    return waitForEventDriven(socket, eventName, null, { timeoutMs, stepMs });
}

/**
 * ✅ Crucial helper: subscribe first, then connect.
 * Prevents missing the initial snapshot.
 */
async function connectAndWaitInitial(
    socket,
    stateEventName,
    { timeoutMs = 1000, stepMs = 20 } = {},
) {
    const p = onceEventDriven(socket, stateEventName, { timeoutMs, stepMs });
    socket.connect();
    return p;
}

async function createTestServer({ intervalMs = 20 } = {}) {
    vi.resetModules();

    const [
        { EVENTS },
        { keyAuthentication },
        { socketConnect, socketDisconnect },
        { startTicker },
        keys,
    ] = await Promise.all([
        import("../../src/sockets/events.js"),
        import("../../src/sockets/auth.js"),
        import("../../src/sockets/handlers.js"),
        import("../../src/runtime/ticker.js"),
        import("../../src/security/global-key-control.js"),
    ]);

    const { CMD, EVT } = EVENTS;
    const { RECEPTIONIST_KEY, SAFETY_KEY, OBSERVER_KEY } = keys;

    const httpServer = http.createServer();
    const ioServer = new Server(httpServer, { connectionStateRecovery: {} });

    ioServer.use(wildcard());
    keyAuthentication(ioServer);
    socketConnect(ioServer);

    const stopTicker = startTicker({ intervalMs });

    await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
    const address = httpServer.address();
    const port = typeof address === "object" ? address.port : null;
    if (!port) throw new Error("No port");

    const url = `http://127.0.0.1:${port}`;

    async function close() {
        stopTicker();
        socketDisconnect(ioServer);
        await new Promise((resolve) => ioServer.close(resolve));
        await new Promise((resolve) => httpServer.close(resolve));
    }

    return {
        url,
        close,
        CMD,
        EVT,
        keys: {
            RECEPTIONIST_KEY,
            SAFETY_KEY,
            OBSERVER_KEY,
        },
    };
}

/**
 * ✅ Important: autoConnect:false to avoid missing initial STATE_UPDATE
 */
function connectClient(url, { role, key }) {
    return ioc(url, {
        transports: ["websocket"],
        auth: { role, key },
        forceNew: true,
        reconnection: false,
        autoConnect: false, // ✅ critical
    });
}

describe.skip("network mini: sockets", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-11T12:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("connects and receives initial STATE_UPDATE snapshot", async () => {
        const srv = await createTestServer();

        const observer = connectClient(srv.url, {
            role: "lap-line-tracker",
            key: srv.keys.OBSERVER_KEY ?? "admin",
        });

        const st0 = await connectAndWaitInitial(
            observer,
            srv.EVT.STATE_UPDATE,
            { timeoutMs: 1000 },
        );
        expect(st0).toBeTruthy();

        observer.disconnect();
        await srv.close();
    });

    it("rejects connection or commands when role has wrong key", async () => {
        const srv = await createTestServer();

        const bad = connectClient(srv.url, {
            role: "front-desk",
            key: "WRONG_KEY",
        });

        // listener first, then connect
        const pErr = waitForEventDriven(
            bad,
            "connect_error",
            (e) => Boolean(e),
            { timeoutMs: 1500, stepMs: 50 },
        );
        bad.connect();

        const err = await pErr;
        expect(err).toBeTruthy();

        bad.disconnect();
        await srv.close();
    });

    it("front-desk can add session and observer sees it in STATE_UPDATE", async () => {
        const srv = await createTestServer();

        const receptionist = connectClient(srv.url, {
            role: "front-desk",
            key: srv.keys.RECEPTIONIST_KEY ?? "admin",
        });

        const observer = connectClient(srv.url, {
            role: "lap-line-tracker",
            key: srv.keys.OBSERVER_KEY ?? "admin",
        });

        await connectAndWaitInitial(receptionist, srv.EVT.STATE_UPDATE, {
            timeoutMs: 1000,
        });
        await connectAndWaitInitial(observer, srv.EVT.STATE_UPDATE, {
            timeoutMs: 1000,
        });

        const ack = await emitCmd(receptionist, srv.CMD.SESSION_ADD, {
            session: { id: "S1", drivers: [] },
        });
        expect(ack.ok).toBe(true);

        const st = await waitForEventDriven(
            observer,
            srv.EVT.STATE_UPDATE,
            (s) =>
                Array.isArray(s?.sessions?.upcoming) &&
                s.sessions.upcoming.some((x) => x.id === "S1"),
            { timeoutMs: 1500, stepMs: 20 },
        );

        expect(st.sessions.upcoming.some((x) => x.id === "S1")).toBe(true);

        receptionist.disconnect();
        observer.disconnect();
        await srv.close();
    });

    it("race-control can start race: current set + timer running", async () => {
        const srv = await createTestServer();

        const receptionist = connectClient(srv.url, {
            role: "front-desk",
            key: srv.keys.RECEPTIONIST_KEY ?? "admin",
        });

        const control = connectClient(srv.url, {
            role: "race-control",
            key: srv.keys.SAFETY_KEY ?? "admin",
        });

        const observer = connectClient(srv.url, {
            role: "lap-line-tracker",
            key: srv.keys.OBSERVER_KEY ?? "admin",
        });

        await connectAndWaitInitial(receptionist, srv.EVT.STATE_UPDATE, {
            timeoutMs: 1000,
        });
        await connectAndWaitInitial(control, srv.EVT.STATE_UPDATE, {
            timeoutMs: 1000,
        });
        await connectAndWaitInitial(observer, srv.EVT.STATE_UPDATE, {
            timeoutMs: 1000,
        });

        expect(
            (
                await emitCmd(receptionist, srv.CMD.SESSION_ADD, {
                    session: { id: "S1", drivers: [] },
                })
            ).ok,
        ).toBe(true);
        expect(
            (
                await emitCmd(receptionist, srv.CMD.DRIVER_ADD, {
                    sessionId: "S1",
                    driver: { name: "A", car: 7 },
                })
            ).ok,
        ).toBe(true);

        const startAck = await emitCmd(control, srv.CMD.RACE_START, {
            durationSec: 1,
        });
        expect(startAck.ok).toBe(true);

        const st = await waitForEventDriven(
            observer,
            srv.EVT.STATE_UPDATE,
            (s) =>
                s?.sessions?.current?.id === "S1" &&
                s?.timer?.status === "running",
            { timeoutMs: 1500, stepMs: 20 },
        );

        expect(st.sessions.current.id).toBe("S1");
        expect(st.timer.status).toBe("running");

        receptionist.disconnect();
        control.disconnect();
        observer.disconnect();
        await srv.close();
    });

    it("race finish flow: after timer ends -> lastResult set; NEXT start is optional", async () => {
        const srv = await createTestServer({ intervalMs: 20 });

        const receptionist = connectClient(srv.url, {
            role: "front-desk",
            key: srv.keys.RECEPTIONIST_KEY ?? "admin",
        });

        const control = connectClient(srv.url, {
            role: "race-control",
            key: srv.keys.SAFETY_KEY ?? "admin",
        });

        const observer = connectClient(srv.url, {
            role: "lap-line-tracker",
            key: srv.keys.OBSERVER_KEY ?? "admin",
        });

        await connectAndWaitInitial(receptionist, srv.EVT.STATE_UPDATE, {
            timeoutMs: 1000,
        });
        await connectAndWaitInitial(control, srv.EVT.STATE_UPDATE, {
            timeoutMs: 1000,
        });
        await connectAndWaitInitial(observer, srv.EVT.STATE_UPDATE, {
            timeoutMs: 1000,
        });

        const seenLastResults = [];
        const onState = (s) => {
            const id = s?.sessions?.lastResult?.id;
            if (id && seenLastResults[seenLastResults.length - 1] !== id) {
                seenLastResults.push(id);
            }
        };
        observer.on(srv.EVT.STATE_UPDATE, onState);

        expect(
            (
                await emitCmd(receptionist, srv.CMD.SESSION_ADD, {
                    session: { id: "S1", drivers: [] },
                })
            ).ok,
        ).toBe(true);
        expect(
            (
                await emitCmd(receptionist, srv.CMD.SESSION_ADD, {
                    session: { id: "S2", drivers: [] },
                })
            ).ok,
        ).toBe(true);

        expect(
            (
                await emitCmd(receptionist, srv.CMD.DRIVER_ADD, {
                    sessionId: "S1",
                    driver: { name: "A", car: 7 },
                })
            ).ok,
        ).toBe(true);
        expect(
            (
                await emitCmd(receptionist, srv.CMD.DRIVER_ADD, {
                    sessionId: "S2",
                    driver: { name: "B", car: 21 },
                })
            ).ok,
        ).toBe(true);

        expect(
            (await emitCmd(control, srv.CMD.RACE_START, { durationSec: 1 })).ok,
        ).toBe(true);

        const running = await waitForEventDriven(
            observer,
            srv.EVT.STATE_UPDATE,
            (s) =>
                s?.sessions?.current?.id === "S1" &&
                s?.timer?.status === "running" &&
                typeof s?.timer?.endsAt === "number",
            { timeoutMs: 1500, stepMs: 20 },
        );

        const endsAt = running.timer.endsAt;

        vi.setSystemTime(endsAt + 5);
        await vi.advanceTimersByTimeAsync(60);

        const post = await waitForEventDriven(
            observer,
            srv.EVT.STATE_UPDATE,
            (s) => {
                const ended =
                    s?.timer?.status === "idle" &&
                    s?.sessions?.current === null;
                const autoNext =
                    s?.timer?.status === "running" &&
                    s?.sessions?.current?.id === "S2";
                return ended || autoNext;
            },
            { timeoutMs: 2000, stepMs: 20 },
        );

        expect(seenLastResults.includes("S1")).toBe(true);
        expect(["S1", "S2"]).toContain(post.sessions?.lastResult?.id ?? null);

        observer.off(srv.EVT.STATE_UPDATE, onState);

        receptionist.disconnect();
        control.disconnect();
        observer.disconnect();
        await srv.close();
    });
});
