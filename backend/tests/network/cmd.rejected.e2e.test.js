import { describe, test, expect, beforeEach, afterEach } from "vitest";

import { EVENTS } from "../../src/sockets/events.js";
import { RECEPTIONIST_KEY } from "../../src/security/global-key-control.js";
import { __resetForTests } from "../../src/runtime/store.js";

import {
    createIoTestServer,
    connectClient,
    onceConnect,
    emitCmd,
    onceEvent,
} from "./_helpers.js";

describe("cmd rejected (network)", () => {
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

    test("ack is ok:false and EVT.CMD_REJECTED is emitted", async () => {
        srv = await createIoTestServer();

        client = connectClient({
            port: srv.port,
            role: "front-desk",
            key: RECEPTIONIST_KEY,
        });
        await onceConnect(client.socket);

        // Listen for server push reject event
        const rejectedPromise = onceEvent(client.socket, EVENTS.EVT.CMD_REJECTED, 2000);

        // Send invalid: missing drivers
        const ack = await emitCmd(
            client.socket,
            EVENTS.CMD.SESSION_ADD,
            { session: { id: "S_BAD" } },
            2000
        );

        expect(ack).toMatchObject({
            ok: false,
        });
        expect(typeof ack.reason).toBe("string");
        expect(ack.reason.length).toBeGreaterThan(0);

        const evt = await rejectedPromise;

        expect(evt).toMatchObject({
            event: EVENTS.CMD.SESSION_ADD,
        });
        expect(typeof evt.reason).toBe("string");
        expect(evt.reason.length).toBeGreaterThan(0);
    });
});
