import logger from "../logger.js";
import { EVENTS } from "./sockets/events.js"
import { startRace } from "./service/race/start.js";

const {CMD, EVT} = EVENTS;

export function socketConnect(io) {
  io.on("connection", (socket) => {
    const role = socket.handshake.auth?.role ?? "unknown";

    logger.info("socket:connect", {
      socketId: socket.id,
      role,
    });

    // Log all incoming socket events (requires io.use(wildcard()) in server.js)
    socket.on("*", (packet) => {
      const [eventName, eventData] = packet.data ?? [];

      // avoid noisy logs
      if (!eventName || eventName === "ping" || eventName === "pong") return;

      logger.info("event:in", {
        socketId: socket.id,
        role,
        eventName,
        eventData,
      });
    });

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

    // socket.on(CMD.RACE_START, () => {
    //   startRace()
    // });

    socket.on("disconnect", (reason) => {
      logger.info("socket:disconnect", {
        socketId: socket.id,
        role,
        reason,
      });
    });
  });
}
