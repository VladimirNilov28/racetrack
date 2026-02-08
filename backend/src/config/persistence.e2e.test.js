// src/config/persistence.e2e.test.js
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";

import { io as ioClient } from "socket.io-client";

/**
 * E2E-ish persistence tests that match YOUR current server contract:
 * - Your server does NOT necessarily emit evt:state:update on connect.
 * - Reliable source of state for the client is ACK payload: { ok:true, state }.
 * - evt:state:update is expected only after a state change (publish).
 *
 * What we test:
 * 1) Start server, connect Socket.IO client, send cmd:* just like frontend.
 * 2) Ensure data appears in ACK state.
 * 3) Stop server (SIGINT), restart server with SAME sqlite file.
 * 4) Send a harmless cmd to retrieve ACK state and verify data is restored.
 * 5) "DB disabled" scenario: delete sqlite file between restarts and verify state resets.
 *
 * Uses REAL timers (no vi.useFakeTimers) because server runs in a child process.
 */

async function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = net.createServer();
        srv.listen(0, "127.0.0.1", () => {
            const { port } = srv.address();
            srv.close(() => resolve(port));
        });
        srv.on("error", reject);
    });
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

async function waitForServerUp({ port, timeoutMs = 6000 }) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            await new Promise((resolve, reject) => {
                const socket = net.connect({ host: "127.0.0.1", port }, () => {
                    socket.end();
                    resolve();
                });
                socket.on("error", reject);
            });
            return;
        } catch {
            await sleep(50);
        }
    }
    throw new Error(
        `Server did not start on port ${port} within ${timeoutMs}ms`,
    );
}

function testDirname() {
    // Works in ESM; decodes URL-encoded paths (spaces, etc.)
    return path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
}

function startServer({ port, sqliteFile }) {
    // This test file is in backend/src/config/ → backend root is ../../
    const backendRoot = path.resolve(testDirname(), "../..");
    const serverEntry = path.join(backendRoot, "src", "server.js");

    const child = spawn(process.execPath, [serverEntry, "--no-keycheck"], {
        cwd: backendRoot,
        env: {
            ...process.env,
            NODE_ENV: "test",
            HOST: "127.0.0.1",
            PORT: String(port),
            SQLITE_FILE: sqliteFile,
        },
        stdio: ["ignore", "pipe", "pipe"],
    });

    const logs = { out: "", err: "" };
    child.stdout.on("data", (d) => (logs.out += d.toString()));
    child.stderr.on("data", (d) => (logs.err += d.toString()));

    return { child, logs };
}

async function stopServer(child) {
    if (!child || child.killed) return;

    await new Promise((resolve) => {
        const t = setTimeout(() => {
            try {
                child.kill("SIGKILL");
            } catch {}
            resolve();
        }, 4000);

        child.once("exit", () => {
            clearTimeout(t);
            resolve();
        });

        try {
            child.kill("SIGINT");
        } catch {
            clearTimeout(t);
            resolve();
        }
    });
}

function connectClient({ port }) {
    return ioClient(`http://127.0.0.1:${port}`, {
        transports: ["websocket"],
        timeout: 4000,
        reconnection: false,
    });
}

async function waitForConnect(socket, timeoutMs = 4000) {
    if (socket.connected) return;

    await new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            cleanup();
            reject(new Error("Socket connect timeout"));
        }, timeoutMs);

        function onOk() {
            cleanup();
            resolve();
        }
        function onErr(err) {
            cleanup();
            reject(err);
        }
        function cleanup() {
            clearTimeout(t);
            socket.off("connect", onOk);
            socket.off("connect_error", onErr);
        }

        socket.on("connect", onOk);
        socket.on("connect_error", onErr);
    });
}

function emitCmd(socket, eventName, payload) {
    return new Promise((resolve) => {
        socket.emit(eventName, payload, (ack) => resolve(ack));
    });
}

async function emitCmdExpectOk(socket, eventName, payload) {
    const ack = await emitCmd(socket, eventName, payload);
    if (!ack?.ok) {
        throw new Error(
            `Command failed: ${eventName} ack=${JSON.stringify(ack)}`,
        );
    }
    return ack.state;
}

function findSession(state, id) {
    const cur = state?.sessions?.current ?? null;
    const upcoming = state?.sessions?.upcoming ?? [];
    const all = [cur, ...upcoming].filter(Boolean);
    return all.find((s) => s.id === id) ?? null;
}

let tmpDir;
let sqliteFile;

beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "racetrack-e2e-"));
    sqliteFile = path.join(tmpDir, "db.sqlite");
});

afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
});

describe("persistence e2e (client-like + restart)", () => {
    it("restores state after server restart (SQLite snapshot)", async () => {
        const port = await getFreePort();

        // --- start server #1 ---
        const { child: srv1, logs: logs1 } = startServer({ port, sqliteFile });
        await waitForServerUp({ port });

        const c1 = connectClient({ port });
        await waitForConnect(c1);

        // Use commands exactly like frontend (emit(cmd,payload,ack))
        await emitCmdExpectOk(c1, "cmd:session:add", {
            session: { id: "S1", drivers: [] },
        });

        const stateAfterDriver = await emitCmdExpectOk(c1, "cmd:driver:add", {
            sessionId: "S1",
            driver: { name: "Max", car: 7 },
        });

        const sess1 = findSession(stateAfterDriver, "S1");
        expect(sess1).toBeTruthy();
        expect(sess1.drivers.some((d) => d.name === "Max" && d.car === 7)).toBe(
            true,
        );

        c1.disconnect();
        await stopServer(srv1);

        // --- start server #2 (same sqlite file) ---
        const { child: srv2, logs: logs2 } = startServer({ port, sqliteFile });
        await waitForServerUp({ port });

        const c2 = connectClient({ port });
        await waitForConnect(c2);

        // Your server does not guarantee evt:state:update on connect.
        // So we trigger a harmless command and read ACK state.
        const restoredState = await emitCmdExpectOk(c2, "cmd:race:set-mode", {
            mode: "safe",
        });

        const sess2 = findSession(restoredState, "S1");
        expect(sess2).toBeTruthy();
        expect(sess2.drivers.some((d) => d.name === "Max" && d.car === 7)).toBe(
            true,
        );

        c2.disconnect();
        await stopServer(srv2);

        // Optional debug in case of flakes
        if (srv1.exitCode && srv1.exitCode !== 0) {
            // eslint-disable-next-line no-console
            console.error("server#1 logs:", logs1.out, logs1.err);
        }
        if (srv2.exitCode && srv2.exitCode !== 0) {
            // eslint-disable-next-line no-console
            console.error("server#2 logs:", logs2.out, logs2.err);
        }
    });

    it("acts like 'DB disabled' if SQLite file is removed between restarts (state resets)", async () => {
        const port = await getFreePort();

        // --- start server #1 ---
        const { child: srv1, logs: logs1 } = startServer({ port, sqliteFile });
        await waitForServerUp({ port });

        const c1 = connectClient({ port });
        await waitForConnect(c1);

        const state1 = await emitCmdExpectOk(c1, "cmd:session:add", {
            session: { id: "S_DB", drivers: [] },
        });

        expect(findSession(state1, "S_DB")).toBeTruthy();

        c1.disconnect();
        await stopServer(srv1);

        // Simulate "DB off / no persistence" by removing sqlite file between restarts
        await fs.rm(sqliteFile, { force: true }).catch(() => {});

        // --- start server #2 ---
        const { child: srv2, logs: logs2 } = startServer({ port, sqliteFile });
        await waitForServerUp({ port });

        const c2 = connectClient({ port });
        await waitForConnect(c2);

        // Again: trigger harmless command and inspect ACK state
        const state2 = await emitCmdExpectOk(c2, "cmd:race:set-mode", {
            mode: "safe",
        });

        expect(findSession(state2, "S_DB")).toBeFalsy();

        c2.disconnect();
        await stopServer(srv2);

        if (srv1.exitCode && srv1.exitCode !== 0) {
            // eslint-disable-next-line no-console
            console.error("server#1 logs:", logs1.out, logs1.err);
        }
        if (srv2.exitCode && srv2.exitCode !== 0) {
            // eslint-disable-next-line no-console
            console.error("server#2 logs:", logs2.out, logs2.err);
        }
    });
});
