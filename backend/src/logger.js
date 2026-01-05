/**
 * This logger took from: https://medium.com/@khajurination/effective-logging-for-nodejs-socket-io-applications-89a1dc3cf492
 * I aslo made some changes
 */

import winston from "winston";
import util from "util"

const {
    format,
    createLogger,
    transport,
    config: {
        npm: { levels },
    },
} = winston;

// Custom formatter to replicate console.log behaviour
const combineMessageAndSplat = format((info, opts) => {
    //combine message and args if any
    info.message = util.format(
        info.message,
        ...(info[Symbol.for("splat")] || [])
    );
    return info;
});

/******* Define Transports *******/
/**
 * Default Winston Logging Levels -
 * (Lower value has higher priority)
 *   error: 0
 *   warn: 1
 *   info: 2
 *   http: 3
 *   verbose: 4
 *   debug: 5
 *   silly: 6
 */