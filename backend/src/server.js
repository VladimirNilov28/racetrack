import express from "express";
import { createServer } from "node:http";
import { env } from "node:process";
import { Server } from "socket.io";
import { keyCheck } from "./security/global-key-control.js";
import { registerPages } from "./routes/pages.js";
import { keyAuthentication } from "./sockets/auth.js";
import { socketConnect } from "./sockets/handlers.js";
import { parseCli, printHelp } from "./config/cli.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import logger from "./logger.js";
import wildcard from "socketio-wildcard";
import { startTicker } from "./runtime/ticker.js";
import { dbInit, dbClose } from "./config/database.js"
import {
  __unsafeReplaceStateForBoot,
  reduceByTime,
  subscribe,
  getState,
} from "./runtime/store.js";

// CLI
const cli = parseCli(process.argv);
if (cli.help) {
  printHelp();
  process.exit(0);
}

// env / security
if (!cli.noKeycheck) keyCheck();

// ---- DB: init + restore snapshot (BOOT only) ----
await dbInit({ filename: env.SQLITE_FILE ?? "backend/db.sqlite" });

const restored = await loadState();
if (restored) {
  __unsafeReplaceStateForBoot(restored);
  // Catch up timers/orchestration after downtime
  reduceByTime(Date.now());
}

const PORT = env.PORT || 8080;
const HOST = env.HOST || "0.0.0.0";

const app = express();
const server = createServer(app);
const io = new Server(server, { connectionStateRecovery: {} });

// Statics
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC = path.join(__dirname, "../../frontend/public");
const JS = path.join(__dirname, "../../frontend/js");
const CSS = path.join(__dirname, "../../frontend/css");

app.use(express.static(PUBLIC));
app.use("/js", express.static(JS));
app.use("/css", express.static(CSS));

// Socket.io patch via socketio-wildcard
io.use(wildcard());

// UI
registerPages(app);

// Sockets
keyAuthentication(io);
socketConnect(io);

// ---- DB: persist snapshots on every state change ----
const unsubscribePersist = subscribe((next) => {
  // IMPORTANT: do not await here (real-time)
  saveState(next).catch((e) => {
    logger.error("db:save:fail", { msg: e?.message });
  });
});

startTicker({ intervalMs: 250 });

process.on("SIGINT", async () => {
  logger.info("server:shutdown");
  try {
    unsubscribePersist?.();
    // Final best-effort save
    await saveState(getState()).catch(() => {});
    await dbClose().catch(() => {});
  } finally {
    process.exit(0);
  }
});

server.listen(PORT, HOST);
logger.info("server:start", {
  host: HOST,
  port: PORT,
  nodeEnv: process.env.NODE_ENV,
});
