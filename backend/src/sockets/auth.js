import { RECEPTIONIST_KEY, SAFETY_KEY, OBSERVER_KEY } from "../security/global-key-control.js";

export function keyAuthentication(io) {
    io.use((socket, next) => {
        const user_key = socket.handshake.auth.key;
        const role = socket.handshake.auth.role;
        switch (role) {
            case "front-desk":
                if (user_key === RECEPTIONIST_KEY) {
                    console.log(`\x1b[32m${role}: correct access key\x1b[0m`);
                    next();
                } else {
                    setTimeout(() => {
                        console.log(`\x1b[31m${role}: invalid access key\x1b[0m`);
                        next(new Error(`${role}: invalid access key`));
                    }, 500)
                }
                break;
            case "race-control":
                if (user_key === SAFETY_KEY) {
                    console.log(`\x1b[32m${role}: correct access key\x1b[0m`);
                    next();
                } else {
                    setTimeout(() => {
                        console.log(`\x1b[31m${role}: invalid access key\x1b[0m`);
                        next(new Error(`${role}: invalid access key`));
                    }, 500)
                }
                break;
            case "lap-line-tracker":
                if (user_key === OBSERVER_KEY) {
                    console.log(`\x1b[32m${role}: correct access key\x1b[0m`);
                    next();
                } else {
                    setTimeout(() => {
                        console.log(`\x1b[31m${role}: invalid access key\x1b[0m`);
                        next(new Error(`${role}: invalid access key`));
                    }, 500)
                }
                break;
            default:
                next();
        }
    })
}