import logger from "../logger.js";
import {
  RECEPTIONIST_KEY,
  SAFETY_KEY,
  OBSERVER_KEY,
} from "../security/global-key-control.js";

function isKeyValid(role, key) {
  switch (role) {
    case "front-desk":
      return key === RECEPTIONIST_KEY;
    case "race-control":
      return key === SAFETY_KEY;
    case "lap-line-tracker":
      return key === OBSERVER_KEY;
    default:
      // Public screens (and unknown roles) do not require a key in this middleware
      return true;
  }
}

export function keyAuthentication(io) {
  io.use((socket, next) => {
    const role = socket.handshake.auth?.role ?? "unknown";
    const hasKey = typeof socket.handshake.auth?.key === "string";

    logger.info("auth:attempt", {
      socketId: socket.id,
      role,
      hasKey,
    });

    const ok = isKeyValid(role, socket.handshake.auth?.key);

    if (!ok) {
      const delayMs = 500; // required by TOS for incorrect access key

      logger.warn("auth:fail", {
        socketId: socket.id,
        role,
        reason: "invalid_key",
        delayMs,
      });

      setTimeout(() => {
        const err = new Error("INVALID_ACCESS_KEY");
        err.data = { code: "INVALID_ACCESS_KEY", role };
        next(err);
      }, delayMs);

      return;
    }

    logger.info("auth:ok", {
      socketId: socket.id,
      role,
    });

    next();
  });
}
