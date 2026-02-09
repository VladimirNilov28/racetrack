import http from "node:http";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import wildcardImport from "socketio-wildcard";

import { EVENTS } from "../../src/sockets/events.js";
import { socketConnect, socketDisconnect } from "../../src/sockets/handlers.js";
import { keyAuthentication } from "../../src/sockets/auth.js";

import { getState, reduceByTime } from "../../src/runtime/store.js";

const wildcard = wildcardImport?.default ?? wildcardImport;

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

export async function createIoTestServer({ allowEIO3 = true } = {}) {
    const httpServer = http.createServer();
    const ioServer = new Server(httpServer, {
        transports: ["websocket"],
        allowEIO3,
    });

    ioServer.use(wildcard());
    keyAuthentication(ioServer);

    socketConnect(ioServer);

    await new Promise((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address();

    let closed = false;

    async function close() {
        if (closed) return;
        closed = true;

        try {
            socketDisconnect(ioServer);
        } catch (_) {}

        await new Promise((resolve) => ioServer.close(resolve));
        await new Promise((resolve) => httpServer.close(resolve));
    }

    function tick(now) {
        return reduceByTime(now);
    }

    return {
        port,
        ioServer,
        httpServer,
        close,
        tick,
    };
}

export function connectClient({ port, role, key }) {
    const url = `http://localhost:${port}`;

    const socket = ioClient(url, {
        transports: ["websocket"],
        forceNew: true,
        reconnection: false,
        auth: { role, key },
    });

    const states = [];
    const onState = (next) => states.push(next);
    socket.on(EVENTS.EVT.STATE_UPDATE, onState);

    function stopCapture() {
        socket.off(EVENTS.EVT.STATE_UPDATE, onState);
    }

    async function close() {
        stopCapture();
        if (socket.connected) socket.disconnect();
        await delay(10);
    }

    return { socket, states, close };
}

export function onceConnect(socket, timeoutMs = 1500) {
    if (socket.connected) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            cleanup();
            reject(new Error("Timeout waiting for socket connect"));
        }, timeoutMs);

        function onConnect() {
            cleanup();
            resolve();
        }

        function onError(err) {
            cleanup();
            reject(new Error(`connect_error: ${err?.message || "unknown"}`));
        }

        function cleanup() {
            clearTimeout(t);
            socket.off("connect", onConnect);
            socket.off("connect_error", onError);
        }

        socket.on("connect", onConnect);
        socket.on("connect_error", onError);
    });
}

export function onceEvent(socket, eventName, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            cleanup();
            reject(new Error(`Timeout waiting for event: ${eventName}`));
        }, timeoutMs);

        function handler(payload) {
            cleanup();
            resolve(payload);
        }

        function cleanup() {
            clearTimeout(t);
            socket.off(eventName, handler);
        }

        socket.on(eventName, handler);
    });
}

export function emitCmd(socket, eventName, payload, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            reject(new Error(`Timeout waiting ack for: ${eventName}`));
        }, timeoutMs);

        socket.emit(eventName, payload, (ack) => {
            clearTimeout(t);
            resolve(ack);
        });
    });
}

export async function waitForState({ socket, states }, predicate, timeoutMs = 1500) {
    const existing = states.find(predicate);
    if (existing) return existing;

    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            cleanup();
            reject(new Error(`Timeout waiting for state predicate (${timeoutMs}ms)`));
        }, timeoutMs);

        function handler(next) {
            if (predicate(next)) {
                cleanup();
                resolve(next);
            }
        }

        function cleanup() {
            clearTimeout(t);
            socket.off(EVENTS.EVT.STATE_UPDATE, handler);
        }

        socket.on(EVENTS.EVT.STATE_UPDATE, handler);
    });
}

export function latestState({ states }) {
    return states[states.length - 1] || null;
}

export function serverState() {
    return getState();
}
