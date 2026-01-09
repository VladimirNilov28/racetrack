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
import { createInitialState } from "./service/state-init.js";

// CLI
const cli = parseCli(process.argv);
if (cli.help) {
    printHelp();
    process.exit(0);
}

// 2) env / security
if (!cli.noKeycheck) keyCheck();

const PORT = env.PORT || 8080;
const HOST = env.HOST || "localhost";

// Single in-memory source of truth for the whole server.
const state = createInitialState();

logger.info("state:init")

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




server.listen(PORT, HOST);
logger.info("server:start", { host: HOST, port: PORT, nodeEnv: process.env.NODE_ENV });
