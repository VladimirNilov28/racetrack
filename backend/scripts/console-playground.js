// scripts/console-playground.js
import http from "node:http";
import readline from "node:readline";

import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";
import wildcard from "socketio-wildcard";

import { EVENTS } from "../src/sockets/events.js";
import { socketConnect, socketDisconnect } from "../src/sockets/handlers.js";
import { keyAuthentication } from "../src/sockets/auth.js";

import { getState, reduceByTime, __resetForTests } from "../src/runtime/store.js";
import { RECEPTIONIST_KEY, SAFETY_KEY, OBSERVER_KEY } from "../src/security/global-key-control.js";

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function pretty(obj) {
    return JSON.stringify(obj, null, 2);
}

function makeDriver(car, name = `D${car}`) {
    return {
        name,
        car,
        laps: 0,
        lastLapAt: null,
        fastestLap: null,
    };
}

function parseKeyByRole(role) {
    if (role === "front-desk") return RECEPTIONIST_KEY;
    if (role === "race-control") return SAFETY_KEY;
    if (role === "lap-line-tracker") return OBSERVER_KEY;
    return "admin";
}

function normalizeRole(input) {
    const v = String(input ?? "").trim().toLowerCase();

    // aliases / common shortcuts
    if (v === "reception" || v === "receptionist") return "front-desk";
    if (v === "safety") return "race-control";
    if (v === "observer" || v === "tracker" || v === "lap") return "lap-line-tracker";

    // exact valid roles
    if (v === "front-desk") return "front-desk";
    if (v === "race-control") return "race-control";
    if (v === "lap-line-tracker") return "lap-line-tracker";

    return null;
}

function assertValidRole(roleInput) {
    const role = normalizeRole(roleInput);
    if (!role) {
        console.log("❗ Unknown role. Use: front-desk | race-control | lap-line-tracker");
        return null;
    }
    return role;
}

function timerLeftSec(timer, now = Date.now()) {
    if (!timer || timer.status !== "running" || timer.endsAt == null) return null;
    return Math.max(0, Math.ceil((timer.endsAt - now) / 1000));
}

async function main() {
    // Optional: start from clean state each run (handy for manual testing)
    if (typeof __resetForTests === "function") {
        __resetForTests();
    }

    const httpServer = http.createServer();
    const ioServer = new Server(httpServer, {
        transports: ["websocket"],
        allowEIO3: true,
    });

    ioServer.use(wildcard());
    keyAuthentication(ioServer);
    socketConnect(ioServer);

    await new Promise((resolve) => httpServer.listen(0, resolve));
    const { port } = httpServer.address();

    console.log(`\n🏁 Racetrack console playground running on http://localhost:${port}\n`);

    // ---- ticker (optional, can be turned on/off) ----
    let ticker = null;
    function startTicker(intervalMs = 250) {
        if (ticker) return;
        ticker = setInterval(() => reduceByTime(Date.now()), intervalMs);
        console.log(`⏱️  ticker: ON (${intervalMs}ms)`);
    }
    function stopTicker() {
        if (!ticker) return;
        clearInterval(ticker);
        ticker = null;
        console.log("⏱️  ticker: OFF");
    }

    // ---- client ----
    let client = null;
    let currentRole = "lap-line-tracker";

    async function connect(role) {
        const normalized = assertValidRole(role);
        if (!normalized) return;

        if (client) {
            client.disconnect();
            client = null;
            await delay(50);
        }

        currentRole = normalized;

        const key = parseKeyByRole(normalized);

        client = ioClient(`http://localhost:${port}`, {
            transports: ["websocket"],
            forceNew: true,
            reconnection: false,
            auth: { role: normalized, key },
        });

        client.on("connect", () => {
            console.log(`✅ client connected as ${normalized} (${client.id})`);
        });

        client.on("connect_error", (e) => {
            console.log(`❌ connect_error: ${e?.message}`, e?.data ? pretty(e.data) : "");
        });

        client.on(EVENTS.EVT.STATE_UPDATE, (state) => {
            const cur = state.sessions.current?.id ?? null;
            const last = state.sessions.lastResult?.id ?? null;
            const up = state.sessions.upcoming.map((s) => s.id);
            const left = timerLeftSec(state.timer);

            console.log(
                `📡 STATE_UPDATE | mode=${state.race.mode.value} | timer=${state.timer.status}` +
                (left != null ? `(${left}s)` : "") +
                ` | current=${cur} | last=${last} | upcoming=[${up.join(", ")}]`
            );
        });

        client.on(EVENTS.EVT.CMD_REJECTED, (payload) => {
            console.log(`🚫 CMD_REJECTED: ${pretty(payload)}`);
        });

        await new Promise((resolve) => {
            client.once("connect", resolve);
            client.once("connect_error", resolve);
        });
    }

    async function sendCmd(type, payload) {
        if (!client) {
            console.log("❗ Client not connected. Use: role <front-desk|race-control|lap-line-tracker>");
            return;
        }

        const ack = await new Promise((resolve) => {
            client.emit(type, payload, (a) => resolve(a));
        });

        console.log(`➡️  ${type} ack: ${pretty(ack)}`);
        return ack;
    }

    // connect default
    await connect(currentRole);

    // ---- CLI ----
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: "racetrack> ",
    });

    function help() {
        console.log(`
Commands:
  help
  state                         print full server state
  status                        print short HUD (current/last/upcoming/timer)
  tick [nowMs]                   call reduceByTime(now) once (default Date.now())
  ticker on [ms]                 start ticker (default 250ms)
  ticker off                     stop ticker
  role <front-desk|race-control|lap-line-tracker>   reconnect client as role
  demo                          add 2 sessions, start race(10s), ticker on 200ms

Session:
  addSession <id> [car]          cmd:session:add with 1 driver (default car=1)
  addSession2 <id1> <id2>        adds 2 sessions (cars 1 and 2)

Race:
  start <durationSec>            cmd:race:start
  finish                         cmd:race:finish
  mode <safe|hazard|finish>      cmd:race:set-mode

Lap:
  lap <car>                      cmd:lap:record

Exit:
  exit
`);
    }

    help();
    rl.prompt();

    rl.on("line", async (line) => {
        const [cmd, ...args] = line.trim().split(/\s+/);

        try {
            if (!cmd) {
                rl.prompt();
                return;
            }

            if (cmd === "help") {
                help();
            }

            else if (cmd === "state") {
                console.log(pretty(getState()));
            }

            else if (cmd === "status") {
                const s = getState();
                const cur = s.sessions.current?.id ?? null;
                const last = s.sessions.lastResult?.id ?? null;
                const up = s.sessions.upcoming.map((x) => x.id);
                const left = timerLeftSec(s.timer);
                console.log(
                    `HUD | mode=${s.race.mode.value} | timer=${s.timer.status}` +
                    (left != null ? `(${left}s)` : "") +
                    ` | current=${cur} | last=${last} | upcoming=[${up.join(", ")}]`
                );
            }

            else if (cmd === "tick") {
                const now = args[0] ? Number(args[0]) : Date.now();
                const next = reduceByTime(now);
                console.log(`🧠 tick(${now}) -> mode=${next.race.mode.value}, timer=${next.timer.status}`);
            }

            else if (cmd === "ticker") {
                if (args[0] === "on") {
                    const ms = args[1] ? Number(args[1]) : 250;
                    startTicker(ms);
                } else if (args[0] === "off") {
                    stopTicker();
                } else {
                    console.log("Usage: ticker on [ms] | ticker off");
                }
            }

            else if (cmd === "role") {
                const role = assertValidRole(args[0]);
                if (role) await connect(role);
            }

            else if (cmd === "demo") {
                // step 1: receptionist creates sessions
                await connect("front-desk");
                await sendCmd(EVENTS.CMD.SESSION_ADD, {
                    session: { id: "S1", drivers: [makeDriver(1, "D1")] },
                });
                await sendCmd(EVENTS.CMD.SESSION_ADD, {
                    session: { id: "S2", drivers: [makeDriver(2, "D2")] },
                });

                // step 2: race control starts race
                await connect("race-control");
                await sendCmd(EVENTS.CMD.RACE_START, { durationSec: 10 });

                // step 3: observer for laps
                await connect("lap-line-tracker");
                startTicker(200);

                console.log("✅ demo ready. Try: lap 1 / lap 2");
            }

            else if (cmd === "addSession") {
                const id = args[0];
                const car = args[1] ? Number(args[1]) : 1;
                if (!id) console.log("Usage: addSession <id> [car]");
                else {
                    await sendCmd(EVENTS.CMD.SESSION_ADD, {
                        session: { id, drivers: [makeDriver(car)] },
                    });
                }
            }

            else if (cmd === "addSession2") {
                const id1 = args[0];
                const id2 = args[1];
                if (!id1 || !id2) console.log("Usage: addSession2 <id1> <id2>");
                else {
                    await sendCmd(EVENTS.CMD.SESSION_ADD, {
                        session: { id: id1, drivers: [makeDriver(1)] },
                    });
                    await sendCmd(EVENTS.CMD.SESSION_ADD, {
                        session: { id: id2, drivers: [makeDriver(2)] },
                    });
                }
            }

            else if (cmd === "start") {
                const durationSec = Number(args[0]);
                if (!durationSec) console.log("Usage: start <durationSec>");
                else await sendCmd(EVENTS.CMD.RACE_START, { durationSec });
            }

            else if (cmd === "finish") {
                await sendCmd(EVENTS.CMD.RACE_FINISH ?? "cmd:race:finish", {});
            }

            else if (cmd === "mode") {
                const mode = args[0];
                if (!mode) console.log("Usage: mode <safe|hazard|finish>");
                else await sendCmd(EVENTS.CMD.RACE_SET_MODE ?? "cmd:race:set-mode", { mode });
            }

            else if (cmd === "lap") {
                const car = Number(args[0]);
                if (!car) console.log("Usage: lap <car>");
                else await sendCmd(EVENTS.CMD.LAP_RECORD, { car });
            }

            else if (cmd === "exit") {
                rl.close();
                return;
            }

            else {
                console.log("Unknown command. Type: help");
            }
        } catch (e) {
            console.log(`💥 error: ${e?.message ?? e}`);
        } finally {
            rl.prompt();
        }
    });

    rl.on("close", async () => {
        console.log("\n👋 shutting down...");

        stopTicker();

        if (client) {
            client.disconnect();
            client = null;
            await delay(50);
        }

        try {
            socketDisconnect(ioServer);
        } catch (_) {}

        await new Promise((resolve) => ioServer.close(resolve));
        await new Promise((resolve) => httpServer.close(resolve));

        process.exit(0);
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
