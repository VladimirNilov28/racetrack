import { describe, test, expect } from "vitest";
import { io as ioClient } from "socket.io-client";

import { createIoTestServer } from "./_helpers.js";

describe("auth guard (network)", () => {
    test("rejects connection with wrong key for race-control", async () => {
        const srv = await createIoTestServer();

        try {
            const socket = ioClient(`http://localhost:${srv.port}`, {
                transports: ["websocket"],
                forceNew: true,
                reconnection: false,
                auth: { role: "race-control", key: "WRONG_KEY" },
            });

            const err = await new Promise((resolve, reject) => {
                const t = setTimeout(() => {
                    reject(new Error("Timeout waiting connect_error"));
                }, 2000);

                socket.on("connect", () => {
                    clearTimeout(t);
                    reject(new Error("Should not connect with wrong key"));
                });

                socket.on("connect_error", (e) => {
                    clearTimeout(t);
                    resolve(e);
                });
            });

            // Your middleware uses INVALID_ACCESS_KEY
            expect(err?.message).toBe("INVALID_ACCESS_KEY");
        } finally {
            await srv.close();
        }
    });
});
