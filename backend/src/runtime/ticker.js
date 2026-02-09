import logger from "../logger.js";
import { reduceByTime } from "./store.js";

export function startTicker({ intervalMs = 250 } = {}) {
    logger.info("ticker:start", { intervalMs });

    const id = setInterval(() => {
        try {
            // One "time step" for orchestration: raceTick + raceRun, publish if changed
            reduceByTime(Date.now());
        } catch (err) {
            // Do NOT throw from ticker: in tests Winston may exit the process on uncaughtException
            logger.error("ticker:error", {
                message: String(err?.message || err),
                stack: err?.stack ? String(err.stack) : undefined,
            });
        }
    }, intervalMs);

    return () => {
        clearInterval(id);
        logger.info("ticker:stop");
    };
}
