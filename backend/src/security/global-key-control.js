import { env } from "node:process";
import logger from "../logger.js";

/**
 * HOW TO DEFINE YOUR ACCESS KEYS:
 *
 * export RECEPTIONIST_KEY=<your key>
 * export SAFETY_KEY=<your key>
 * export OBSERVER_KEY=<your key>
 */

// NOTE: do NOT log actual key values
const RECEPTIONIST_KEY = env.RECEPTIONIST_KEY || "admin";
const SAFETY_KEY = env.SAFETY_KEY || "admin";
const OBSERVER_KEY = env.OBSERVER_KEY || "admin";

const info = `
Configure:
  export RECEPTIONIST_KEY=<your key>  Define access key for /front-desk
  export SAFETY_KEY=<your key>        Define access key for /race-control
  export OBSERVER_KEY=<your key>      Define access key for /lap-line-tracker
`;

export const keyCheck = () => {
  logger.info("server:env:check", {
    receptionistKeyPresent: !!env.RECEPTIONIST_KEY,
    safetyKeyPresent: !!env.SAFETY_KEY,
    observerKeyPresent: !!env.OBSERVER_KEY,
  });

  if (!RECEPTIONIST_KEY) {
    logger.error("server:env:missing", {
      key: "RECEPTIONIST_KEY",
      hint: info,
    });
    process.exit(1);
  }

  if (!SAFETY_KEY) {
    logger.error("server:env:missing", {
      key: "SAFETY_KEY",
      hint: info,
    });
    process.exit(1);
  }

  if (!OBSERVER_KEY) {
    logger.error("server:env:missing", {
      key: "OBSERVER_KEY",
      hint: info,
    });
    process.exit(1);
  }

  logger.info("server:env:ok");
};

export {
  RECEPTIONIST_KEY,
  SAFETY_KEY,
  OBSERVER_KEY,
};
