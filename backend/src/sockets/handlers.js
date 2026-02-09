import logger from "../logger.js";
import { EVENTS } from "./events.js";
import { getState, dispatch, subscribe } from "../runtime/store.js";

const { EVT } = EVENTS;

export function socketConnect(io) {
    // Subscribe to store updates once per io instance
    if (!io.__racetrackStoreUnsub) {
        io.__racetrackStoreUnsub = subscribe((next) => {
            io.emit(EVT.STATE_UPDATE, next);
        });
    }

    io.on("connection", (socket) => {
        const role = socket.handshake.auth?.role ?? "unknown";

        logger.info("socket:connect", {
            socketId: socket.id,
            role,
        });

        // Send current state to newly connected client
        socket.emit(EVT.STATE_UPDATE, getState());

        // Patch emit to log outgoing events
        const _emit = socket.emit.bind(socket);
        socket.emit = function (eventName, eventData, ...rest) {
            // avoid noisy logs
            if (eventName !== "pong") {
                logger.info("event:out", {
                    socketId: socket.id,
                    role,
                    eventName,
                    eventData,
                });
            }
            return _emit(eventName, eventData, ...rest);
        };

        // Ping -> Pong (testing)
        socket.on("ping", (payload) => {
            logger.debug("ping:in", {
                socketId: socket.id,
                role,
                payload,
            });
            socket.emit("pong", payload);
        });

        // Catch-all handler for incoming events (requires io.use(wildcard()) in server.js)
        socket.on("*", (packet) => {
            const [eventName, payload, ack] = packet.data ?? [];

            // Log incoming events (except ping/pong to reduce noise)
            if (eventName && eventName !== "ping" && eventName !== "pong") {
                logger.info("event:in", {
                    socketId: socket.id,
                    role,
                    eventName,
                    eventData: payload,
                });
            }

            // Only process command events (cmd:*)
            if (typeof eventName !== "string") return;
            if (!eventName.startsWith("cmd:")) return;

            try {
                const next = dispatch({ type: eventName, payload });

                // Ack success (if client provided callback)
                if (typeof ack === "function") {
                    ack({ ok: true, state: next });
                }
            } catch (err) {
                const reason = String(err?.message || err);

                logger.warn("cmd:rejected", {
                    socketId: socket.id,
                    role,
                    eventName,
                    reason,
                });

                // Ack failure (if client provided callback)
                if (typeof ack === "function") {
                    ack({ ok: false, reason });
                }

                // Notify client UI
                socket.emit(EVT.CMD_REJECTED, { event: eventName, reason });
            }
        });

        socket.on("disconnect", (reason) => {
            logger.info("socket:disconnect", {
                socketId: socket.id,
                role,
                reason,
            });
        });
    });
}

/**
 * Clean up store subscription when io server closes.
 * Call this in your server teardown or before closing the server.
 */
export function socketDisconnect(io) {
    if (typeof io.__racetrackStoreUnsub === "function") {
        io.__racetrackStoreUnsub();
        delete io.__racetrackStoreUnsub;
        logger.info("sockets:cleanup", { reason: "store subscription closed" });
    }
}
