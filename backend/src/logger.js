/**
 * This logger took from: https://medium.com/@khajurination/effective-logging-for-nodejs-socket-io-applications-89a1dc3cf492
 * I also made some changes
 */

import winston from "winston";
import util from "node:util";
import fs from "node:fs";
import path from "node:path";

const {
  format,
  createLogger,
  transports,
  config: {
    npm: { levels },
  },
} = winston;

const IS_DEBUG = process.env.DEBUG === "true";
const LOG_DIR = path.resolve("./logs");

/**
 * Ensure logs directory exists (for File transport).
 */
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  // if we can't create logs directory, file logging may fail
}

/**
 * Custom formatter to replicate console.log behaviour.
 * Allows: logger.info("x=%d", 5)
 */
const combineMessageAndSplat = format((info) => {
  info.message = util.format(info.message, ...(info[Symbol.for("splat")] || []));
  return info;
});

/**
 * Remove noisy / internal winston keys from printed meta.
 * Also drop Symbol(...) keys (we never want to print them).
 */
function cleanMeta(info) {
  const meta = {};

  for (const [k, v] of Object.entries(info)) {
    if (k === "level" || k === "message" || k === "timestamp" || k === "stack") continue;
    if (k === "splat") continue;
    meta[k] = v;
  }

  // Symbols are not included by Object.entries, so no extra filtering needed here.
  return meta;
}

/**
 * Console transport (pretty + compact).
 */
const consoleTransport = new transports.Console({
  level: IS_DEBUG ? "silly" : "info",
  handleExceptions: true,
  // DO NOT set json: true when using printf() output
  format: format.combine(
    format.errors({ stack: true }),
    combineMessageAndSplat(),
    format.timestamp({ format: "HH:mm:ss.SSS" }),
    format.colorize(),
    format.printf((info) => {
      const { timestamp, level, message, stack } = info;

      const meta = cleanMeta(info);
      const metaStr = Object.keys(meta).length
        ? ` ${util.inspect(meta, { depth: 5, colors: true, compact: true, breakLength: 140 })}`
        : "";

      return `${timestamp} ${level}: ${message}${metaStr}${stack ? `\n${stack}` : ""}`;
    })
  ),
});

/**
 * File transport (JSON for machines).
 */
const fileTransport = new transports.File({
  level: "debug",
  filename: path.join(LOG_DIR, "app.log"),
  handleExceptions: true,
  format: format.combine(
    format.errors({ stack: true }),
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    format.json()
  ),
});

/**
 * Create logger.
 *
 * Note:
 * - Global "format" is applied first.
 * - Transport "format" is applied after that transport is selected.
 * We keep global format minimal to avoid polluting console output.
 */
const logger = createLogger({
  levels,
  defaultMeta: {
    environment: process.env.NODE_ENV || "local",
  },
  format: format.combine(
    format.errors({ stack: true }),
    // keep minimal, each transport defines its own format
    format((info) => info)()
  ),
  transports: [fileTransport, consoleTransport],
});

export default logger;

/**
 * Overview:
 *  - Use logger to record all important server actions.
 *  - Prefer structured logs: logger.<level>(<logName>, <metaObject>)
 *  - Never log secrets (access keys, tokens, passwords).
 *
 * Log levels:
 *  - error: unexpected failures, exceptions, critical runtime problems
 *  - warn: rejected actions, auth failures, invalid input, suspicious behaviour
 *  - info: normal lifecycle milestones (server start, connect, race start, mode change, session end)
 *  - debug/silly: verbose diagnostics (payload dumps, snapshots, noisy events)
 *
 * Environment control:
 *  - DEBUG=true enables verbose console logs (level "silly")
 *  - DEBUG is a string, use exactly DEBUG=true
 *
 * Recommended format:
 *  - logger.info("server:start", { host, port })
 *  - logger.warn("auth:fail", { socketId, role, reason, delayMs: 500 })
 *  - logger.error("server:error", { message, stack })
 */
