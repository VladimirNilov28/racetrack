import { describe, it, expect, afterEach } from "vitest";

import http from "node:http";
import { Server } from "socket.io";
import { io as ioc } from "socket.io-client";
import wildcard from "socketio-wildcard";

import { EVENTS } from "../../src/sockets/events.js";
import { keyAuthentication } from "../../src/sockets/auth.js";
import { socketConnect, socketDisconnect } from "../../src/sockets/handlers.js";

import { startTicker } from "../../src/runtime/ticker.js";

import {
    RECEPTIONIST_KEY,
    SAFETY_KEY,
    OBSERVER_KEY,
} from "../../src/security/global-key-control.js";

const { CMD, EVT } = EVENTS;

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function emitCmd(socket, eventName, payload) {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (res) => resolve(res));
    });
}

function expectOk(res) {
    if (!res?.ok) {
        // helps A LOT when debugging
        // eslint-disable-next-line no-console
        console.log("[DEBUG] cmd failed:", res);
    }
    expect(res?.ok).toBe(true);
}

function createStateTracker(socket) {
    let last = null;

    const onState = (st) => {
        last = st;
    };

    socket.on(EVT.STATE_UPDATE, onState);

    function get() {
        return last;
    }

    function wait(predicate, { timeoutMs = 6000, debugLabel = "" } = {}) {
        return new Promise((resolve, reject) => {
            const startedAt = Date.now();

            if (last && predicate(last)) {
                resolve(last);
                return;
            }

            const timeoutId = setTimeout(() => {
                cleanup();
                const spent = Date.now() - startedAt;
                reject(
                    new Error(
                        `Timeout waiting for state condition (${spent}ms) ${debugLabel}`.trim()
                    )
                );
            }, timeoutMs);

            function cleanup() {
                clearTimeout(timeoutId);
                socket.off(EVT.STATE_UPDATE, onUpdate);
            }

            function onUpdate(st) {
                try {
                    if (predicate(st)) {
                        cleanup();
                        resolve(st);
                    }
                } catch (err) {
                    cleanup();
                    reject(err);
                }
            }

            socket.on(EVT.STATE_UPDATE, onUpdate);
        });
    }

    function stop() {
        socket.off(EVT.STATE_UPDATE, onState);
    }

    return { get, wait, stop };
}

describe("network scenario: full socket lifecycle (2 races back-to-back)", () => {
    const opened = [];

    afterEach(async () => {
        while (opened.length) {
            const fn = opened.pop();
            try {
                await fn();
            } catch {
                // ignore
            }
        }
    });

    it("runs 2 races via real sockets: sessions+drivers -> start -> laps -> timer ends -> next -> end",
        async () => {
            // --- 1) Start real HTTP + Socket.IO server on random port ---
            const httpServer = http.createServer();
            const ioServer = new Server(httpServer, {
                connectionStateRecovery: {},
            });

            ioServer.use(wildcard());

            keyAuthentication(ioServer);
            socketConnect(ioServer);

            const stopTicker = startTicker({ intervalMs: 20 });

            opened.push(async () => {
                try {
                    stopTicker();
                } catch {
                    // ignore
                }
                try {
                    socketDisconnect(ioServer);
                } catch {
                    // ignore
                }
                await new Promise((resolve) => ioServer.close(resolve));
                await new Promise((resolve) => httpServer.close(resolve));
            });

            await new Promise((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
            const address = httpServer.address();
            const port = typeof address === "object" ? address.port : null;
            expect(port).not.toBe(null);

            const url = `http://127.0.0.1:${port}`;

            // --- 2) Connect 3 real clients with roles/keys ---
            const receptionist = ioc(url, {
                transports: ["websocket"],
                auth: { role: "front-desk", key: RECEPTIONIST_KEY ?? "admin" },
                forceNew: true,
                reconnection: false,
                autoConnect: false,
            });

            const raceControl = ioc(url, {
                transports: ["websocket"],
                auth: { role: "race-control", key: SAFETY_KEY ?? "admin" },
                forceNew: true,
                reconnection: false,
            });

            const observer = ioc(url, {
                transports: ["websocket"],
                auth: { role: "lap-line-tracker", key: OBSERVER_KEY ?? "admin" },
                forceNew: true,
                reconnection: false,
            });

            opened.push(async () => {
                receptionist.disconnect();
                raceControl.disconnect();
                observer.disconnect();
            });

            const receptionistState = createStateTracker(receptionist);
            const raceControlState = createStateTracker(raceControl);
            const observerState = createStateTracker(observer);

            receptionist.connect();
            raceControl.connect();
            observer.connect();

            opened.push(async () => {
                receptionistState.stop();
                raceControlState.stop();
                observerState.stop();
            });

            const connErrors = [];
            receptionist.on("connect_error", (e) => connErrors.push(["receptionist", e]));
            raceControl.on("connect_error", (e) => connErrors.push(["raceControl", e]));
            observer.on("connect_error", (e) => connErrors.push(["observer", e]));

            await receptionistState.wait((st) => !!st, { timeoutMs: 6000, debugLabel: "initial receptionist" });
            await raceControlState.wait((st) => !!st, { timeoutMs: 6000, debugLabel: "initial raceControl" });
            await observerState.wait((st) => !!st, { timeoutMs: 6000, debugLabel: "initial observer" });

            expect(connErrors).toEqual([]);

            // --- 3) Setup: 2 sessions, drivers in both ---
            let res;

            // ✅ IMPORTANT: drivers: [] is required by your domain validation
            res = await emitCmd(receptionist, CMD.SESSION_ADD, { session: { id: "S1", drivers: [] } });
            expectOk(res);

            res = await emitCmd(receptionist, CMD.SESSION_ADD, { session: { id: "S2", drivers: [] } });
            expectOk(res);

            res = await emitCmd(receptionist, CMD.DRIVER_ADD, {
                sessionId: "S1",
                driver: { name: "Alice", car: 7 },
            });
            expectOk(res);

            res = await emitCmd(receptionist, CMD.DRIVER_ADD, {
                sessionId: "S1",
                driver: { name: "Bob", car: 12 },
            });
            expectOk(res);

            res = await emitCmd(receptionist, CMD.DRIVER_ADD, {
                sessionId: "S2",
                driver: { name: "Carol", car: 21 },
            });
            expectOk(res);

            res = await emitCmd(receptionist, CMD.DRIVER_ADD, {
                sessionId: "S2",
                driver: { name: "Dan", car: 33 },
            });
            expectOk(res);

            // --- 4) Start Race 1 ---
            res = await emitCmd(raceControl, CMD.RACE_START, { durationSec: 1 });
            expectOk(res);

            let s1 = await observerState.wait(
                (st) => st?.sessions?.current?.id === "S1" && st?.timer?.status === "running",
                { timeoutMs: 6000, debugLabel: "race1 start" }
            );

            expect(s1.sessions.current.id).toBe("S1");
            expect(s1.timer.status).toBe("running");
            expect(typeof s1.timer.endsAt).toBe("number");

            // --- Race 1: laps ---
            await delay(30);
            res = await emitCmd(observer, CMD.LAP_RECORD, { car: 7 });
            expectOk(res);

            await observerState.wait(
                (st) =>
                    st?.sessions?.current?.id === "S1" &&
                    st.sessions.current.drivers?.some((d) => d.car === 7 && d.laps === 1),
                { timeoutMs: 6000, debugLabel: "race1 lap1 car7" }
            );

            await delay(30);
            res = await emitCmd(observer, CMD.LAP_RECORD, { car: 7 });
            expectOk(res);

            s1 = await observerState.wait(
                (st) => {
                    if (st?.sessions?.current?.id !== "S1") return false;
                    const d7 = st.sessions.current.drivers?.find((d) => d.car === 7);
                    return d7?.laps === 2;
                },
                { timeoutMs: 6000, debugLabel: "race1 lap2 car7" }
            );

            await delay(30);
            res = await emitCmd(observer, CMD.LAP_RECORD, { car: 12 });
            expectOk(res);

            await observerState.wait(
                (st) => {
                    if (st?.sessions?.current?.id !== "S1") return false;
                    const d12 = st.sessions.current.drivers?.find((d) => d.car === 12);
                    return d12?.laps === 1;
                },
                { timeoutMs: 6000, debugLabel: "race1 lap1 car12" }
            );

            // --- 5) Wait until race 1 should finish by time ---
            const endsAt1 = s1.timer.endsAt;
            const waitMs1 = Math.max(0, endsAt1 - Date.now()) + 80;
            await delay(waitMs1);

            const afterRace1 = await observerState.wait(
                (st) => st?.sessions?.lastResult?.id === "S1",
                { timeoutMs: 6000, debugLabel: "race1 finished (lastResult=S1)" }
            );

            expect(afterRace1.sessions.lastResult.id).toBe("S1");

            // --- 6) Ensure Race 2 is running (auto OR manual start) ---
            let s2Start = observerState.get();

            const isS2Running =
                s2Start?.sessions?.current?.id === "S2" && s2Start?.timer?.status === "running";

            if (!isS2Running) {
                res = await emitCmd(raceControl, CMD.RACE_START, { durationSec: 1 });
                expectOk(res);

                s2Start = await observerState.wait(
                    (st) => st?.sessions?.current?.id === "S2" && st?.timer?.status === "running",
                    { timeoutMs: 6000, debugLabel: "race2 start" }
                );
            }

            expect(s2Start.sessions.current.id).toBe("S2");
            expect(s2Start.timer.status).toBe("running");
            expect(typeof s2Start.timer.endsAt).toBe("number");

            // --- Race 2: laps ---
            await delay(30);
            res = await emitCmd(observer, CMD.LAP_RECORD, { car: 21 });
            expectOk(res);

            await delay(30);
            res = await emitCmd(observer, CMD.LAP_RECORD, { car: 21 });
            expectOk(res);

            const s2 = await observerState.wait(
                (st) => {
                    if (st?.sessions?.current?.id !== "S2") return false;
                    const d21 = st.sessions.current.drivers?.find((d) => d.car === 21);
                    return d21?.laps === 2;
                },
                { timeoutMs: 6000, debugLabel: "race2 laps car21=2" }
            );

            // --- 7) Wait until race 2 finishes by time ---
            const endsAt2 = s2.timer.endsAt;
            const waitMs2 = Math.max(0, endsAt2 - Date.now()) + 80;
            await delay(waitMs2);

            const sEnd = await observerState.wait(
                (st) =>
                    st?.sessions?.lastResult?.id === "S2" &&
                    st?.sessions?.current === null &&
                    st?.timer?.status === "idle",
                { timeoutMs: 6000, debugLabel: "final end state" }
            );

            expect(sEnd.sessions.current).toBe(null);
            expect(sEnd.sessions.lastResult.id).toBe("S2");
            expect(sEnd.timer.status).toBe("idle");

            // --- 8) Validate rejection after current=null ---
            const rejectedEvent = new Promise((resolve) => {
                observer.once(EVT.CMD_REJECTED, (payload) => resolve(payload));
            });

            const lapRes = await emitCmd(observer, CMD.LAP_RECORD, { car: 21 });
            expect(lapRes.ok).toBe(false);

            const rej = await rejectedEvent;
            expect(rej.event).toBe(CMD.LAP_RECORD);
        },
        20000
    );
});
