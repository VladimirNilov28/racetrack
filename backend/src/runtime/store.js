import { createInitialState } from "../service/state-init.js";
import logger from "../logger.js";

import { env } from "node:process"

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

/**
 * dispatch(cmd):
 * - applies domain command
 * - runs orchestration (tick + run)
 * - saves state
 * - publishes if reference changed
 */
const DEFAULT_DURATION_SEC = env.NODE_ENV === "production" ? 600 : 60;
const RACE_DURATION_SEC = env.RACE_DURATION_SEC
    ? Number(env.RACE_DURATION_SEC)
    : DEFAULT_DURATION_SEC;
export function dispatch(cmd) {
    const prev = state;
    const { type, payload } = cmd ?? {};

    let next = state;

    

    switch (type) {
        // --- RACE (Safety / Race Control) ---
        case "cmd:race:start":
            next = startRace(next, RACE_DURATION_SEC);
            break;

        case "cmd:race:set-mode":
            next = setRaceMode(next, payload?.mode);
            break;

        case "cmd:race:finish":
            next = finishRace(next);
            break;

        // --- SESSION (Receptionist) ---
        case "cmd:session:add":
            // expect payload: { id }
            next = addSession(next, payload?.session ?? payload);
            break;

        case "cmd:session:remove":
            // payload: { id }
            next = removeSession(next, payload?.id);
            break;

        case "cmd:session:end":
            next = endSession(next);
            break;

        // --- DRIVER (Receptionist) ---
        case "cmd:driver:add":
            // payload: { sessionId, driver }
            next = addDriver(next, payload?.sessionId, payload?.driver);
            break;

        case "cmd:driver:update":
            // payload: { sessionId, car, patch }
            next = editDriver(next, payload?.sessionId, payload?.car, payload?.patch);
            break;

        case "cmd:driver:remove":
            // payload: { sessionId, car }
            next = removeDriver(next, payload?.sessionId, payload?.car);
            break;

        // --- LAP (Observer) ---
        case "cmd:lap:record":
            next = recordLap(next, payload?.car);
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
 * reduceByTime(now):
 * ONLY orchestration, without commands.
 * This will be called by ticker.
 */
export function reduceByTime(now = Date.now()) {
    const prev = state;

    // IMPORTANT: capture duration BEFORE raceTick can clear/reset timer fields
    const durationSec = state.timer?.durationSec;

    let next = state;

    // 1) time-based transition to finish
    next = raceTick(next, now);

    // 2) when in finish, raceRun needs durationSec from the race that just ended
    if (next.race?.mode?.value === "finish") {
        if (durationSec == null) {
            logger.warn("raceRun:skip", { reason: "durationSec is missing" });
        } else {
            next = raceRun(next, { durationSec });
        }
    }

    state = next;

    if (next !== prev) publish(next);
    return next;
}

/**
 * __resetForTests():
 * Test-only helper to reset singleton store state between tests.
 * No commands, no orchestration — just hard reset.
 */
export function __resetForTests(seed = null) {
    state = seed ?? createInitialState();
    listeners.clear(); // IMPORTANT: prevents leftover subscriptions between tests
    logger.info("state:reset", { environment: process.env.NODE_ENV ?? "unknown" });
    return state;
}