import {env} from "node:process";
/**
 * HOW TO DEFINE YOU ACESS KEYS:
 * 
 * export RECEPTIONIST_KEY=<your key>
 * export SAFETY_KEY=<your key>
 * export OBSERVER_KEY=<your key>
 * 
 */

const RECEPTIONIST_KEY = env.RECEPTIONIST_KEY;
const SAFETY_KEY = env.SAFETY_KEY;
const OBSERVER_KEY = env.OBSERVER_KEY;

const info = `\x1b[31m
        Configure:
            export RECEPTIONIST_KEY=<your key>  Define acess key for /front-desk
            export SAFETY_KEY=<your key>        Define acess key for /race-control
            export OBSERVER_KEY=<your key>      Define acess key for /lap-line-tracker
        \x1b[0m`;

if (!RECEPTIONIST_KEY) {
    console.error("\x1b[31mERROR: RECEPTIONIST_KEY is not defined\x1b[0m \n", info)
    process.exit(1);
}

if (!SAFETY_KEY) {
    console.error("\x1b[31mERROR: SAFETY_KEY is not defined\x1b[0m \n", info)
    process.exit(1);
}

if (!OBSERVER_KEY) {
    console.error("\x1b[31mERROR: OBSERVER_KEY is not defined\x1b[0m \n", info)
    process.exit(1);
}


export {
  RECEPTIONIST_KEY,
  SAFETY_KEY,
  OBSERVER_KEY,
};