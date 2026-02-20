import { createInitialState } from "../service/state-init.js";
import logger from "../logger.js";
import { env } from "node:process";

import { startRace } from "../service/race/start.js";
import { finishRace } from "../service/race/finish.js";
import { setRaceMode } from "../service/race/set-mode.js";

import { addSession } from "../service/session/add.js";
import { removeSession } from "../service/session/remove.js";
import { endSession } from "../service/session/end.js";

import { addDriver } from "../service/driver/add.js";
import { editDriver } from "../service/driver/edit.js";
import { removeDriver } from "../service/driver/remove.js";

import { raceTick } from "../service/orchestration/race-tick.js";
import { raceRun } from "../service/orchestration/race-run.js";

import { recordLap } from "../service/lap-record.js";

let state = createInitialState();
logger.info("state:init");

const listeners = new Set();

export function getState() {
    return state;
}

export function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function publish(next) {
    for (const fn of listeners) fn(next);
}

const DEFAULT_DURATION_SEC = env.NODE_ENV === "production" ? 600 : 60;
const RACE_DURATION_SEC = env.RACE_DURATION_SEC
    ? Number(env.RACE_DURATION_SEC)
    : DEFAULT_DURATION_SEC;

/**
 * Main command dispatcher
 */
export function dispatch(cmd) {
    const prev = state;
    const { type, payload } = cmd ?? {};

    let next = state;

    switch (type) {
        // --- RACE CONTROL ---
        case "cmd:race:start":
            next = startRace(next, payload?.durationSec ?? RACE_DURATION_SEC);
            break;

        case "cmd:race:set-mode":
            // Fix: If 'finish' mode is requested, use finishRace to stop the timer
            if (payload?.mode === "finish") {
                next = finishRace(next);
            } else {
                next = setRaceMode(next, payload?.mode);
            }
            break;

        case "cmd:race:finish":
            next = finishRace(next);
            break;

        // --- SESSION MANAGEMENT ---
        case "cmd:session:add":
            next = addSession(next, payload?.session ?? payload);
            break;

        case "cmd:session:remove":
            next = removeSession(next, payload?.id);
            break;

        case "cmd:session:end":
            next = endSession(next);
            // Orchestrate auto-start if applicable
            next = raceRun(next, { durationSec: RACE_DURATION_SEC });
            break;

        // --- DRIVER MANAGEMENT ---
        case "cmd:driver:add":
            next = addDriver(next, payload?.sessionId, payload?.driver);
            break;

        case "cmd:driver:update":
            next = editDriver(
                next,
                payload?.sessionId,
                payload?.car,
                payload?.patch,
            );
            break;

        case "cmd:driver:remove":
            next = removeDriver(next, payload?.sessionId, payload?.car);
            break;

        // --- LAP TRACKING ---
        case "cmd:lap:record":
            next = recordLap(next, payload?.car);
            break;

        case "cmd:race:auto-start:set":
            next = {
                ...next,
                race: {
                    ...next.race,
                    autoStartNext: Boolean(payload?.enabled),
                },
            };
            break;

        default:
            throw new Error(`Unknown command: ${type}`);
    }

    state = next;

    if (next !== prev) publish(next);
    else logger.debug("state:unchanged", { type });

    return next;
}

/**
 * Periodic orchestration (called by ticker)
 */
export function reduceByTime(now = Date.now()) {
    const prev = state;
    let next = state;

    // Automaticaly finish race if timer expires
    next = raceTick(next, now);

    state = next;

    if (next !== prev) publish(next);
    return next;
}

export function __resetForTests(seed = null) {
    state = seed ?? createInitialState();
    listeners.clear();
    logger.info("state:reset");
    return state;
}

export function __unsafeReplaceStateForBoot(restored) {
    state = restored ?? createInitialState();
    logger.info("state:restored", { restored: Boolean(restored) });
    return state;
}
