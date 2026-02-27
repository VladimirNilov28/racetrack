import 'dotenv/config';
import { env } from "node:process";
import logger from "../logger.js";

// NOTE: do NOT log actual key values
const RECEPTIONIST_KEY = env.RECEPTIONIST_KEY;
const SAFETY_KEY = env.SAFETY_KEY;
const OBSERVER_KEY = env.OBSERVER_KEY;

const info = `
Missing Required Environment Variables!

Please configure your access keys before starting the server:
  export RECEPTIONIST_KEY=<your key>  Define access key for /front-desk
  export SAFETY_KEY=<your key>        Define access key for /race-control
  export OBSERVER_KEY=<your key>      Define access key for /lap-line-tracker
`;

export const keyCheck = () => {
    logger.info("server:env:check", {
        receptionistKeyPresent: !!RECEPTIONIST_KEY,
        safetyKeyPresent: !!SAFETY_KEY,
        observerKeyPresent: !!OBSERVER_KEY,
    });

    const missingKeys = [];
    if (!RECEPTIONIST_KEY) missingKeys.push("RECEPTIONIST_KEY");
    if (!SAFETY_KEY) missingKeys.push("SAFETY_KEY");
    if (!OBSERVER_KEY) missingKeys.push("OBSERVER_KEY");


    if (missingKeys.length > 0) {

        logger.error("server:env:missing", { missingKeys });

        console.error(info);

        process.exit(1);
    }

    logger.info("server:env:ok");
};

export { RECEPTIONIST_KEY, SAFETY_KEY, OBSERVER_KEY };
