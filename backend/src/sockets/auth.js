import { RECEPTIONIST_KEY, SAFETY_KEY, OBSERVER_KEY } from "../security/global-key-control.js";

function isKeyValid(role, key) {
    switch (role) {
        case "front-desk":
            return key === RECEPTIONIST_KEY;
        case "race-control":
            return key === SAFETY_KEY;
        case "lap-line-tracker":
            return key === OBSERVER_KEY;
        default:
            return true;
    }
}пшепше

export function keyAuthentication(io) {
    io.use((socket, next) => {
        const role = socket.handshake.auth?.role;
        const key = socket.handshake.auth?.key;

        const ok = isKeyValid(role, key);
        if (!ok) {
            const err = new Error("INVALID_ACCESS_KEY");
            err.data = { code: "INVALID_ACCESS_KEY", role };
            return next(err);
        }

        next();
    });
}