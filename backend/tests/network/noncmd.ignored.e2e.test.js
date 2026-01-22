import { describe, test, expect, beforeEach, afterEach } from "vitest";

import { EVENTS } from "../../src/sockets/events.js";
import { OBSERVER_KEY } from "../../src/security/global-key-control.js";
import { __resetForTests } from "../../src/runtime/store.js";

import {
    createIoTestServer,
    connectClient,
    onceConnect,
    latestState,
} from "./_helpers.js";

describe("non-cmd events (network)", () => {
    let srv;
    let client;

    beforeEach(() => {
        __resetForTests();
    });

    afterEach(async () => {
        if (client) await client.close();
        client = null;

        if (srv) await srv.close();
        srv = null;
    });

    test("random events do not change state", async () => {
        srv = await createIoTestServer();

        client = connectClient({
            port: srv.port,
            role: "lap-line-tracker",
            key: OBSERVER_KEY,
        });
        await onceConnect(client.socket);

        // Ensure initial snapshot exists
        await new Promise((r) => setTimeout(r, 50));
        const before = latestState(client);
        expect(before).not.toBeNull();

        // Emit a non-cmd event (should be ignored by server handler)
        client.socket.emit("evt:random:noise", { hello: "world" });

        // Give server a beat; if it wrongly dispatches, it would publish a new state
        await new Promise((r) => setTimeout(r, 100));

        const after = latestState(client);

        // Reference should remain the same if no publish happened
        expect(after).toBe(before);

        // And meta.updatedAt shouldn't change either (extra safety)
        expect(after.meta.updatedAt).toBe(before.meta.updatedAt);
    });
});
