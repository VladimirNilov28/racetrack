import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { RECEPTIONIST_KEY, SAFETY_KEY, OBSERVER_KEY, keyCheck } from "./security/global-key-control.js";

const args = process.argv.slice(2);
const info = `
        Usage:
            npm run dev [options]               Run dev mode
        
        Options:
            --help                              Show help
        
        Configure:
            export RECEPTIONIST_KEY=<your key>  Define acсess key for /front-desk
            export SAFETY_KEY=<your key>        Define acсess key for /race-control
            export OBSERVER_KEY=<your key>      Define acсess key for /lap-line-tracker
        `;
if (args.includes("--help") || args.includes("-h")) {
    console.log(info);
    process.exit(0);
}

keyCheck();

const PORT = env.PORT || 8080;
const HOST = env.HOST || "localhost";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {}
});

const PUBLIC = path.join(__dirname, "../../frontend/public");
const JS = path.join(__dirname, "../../frontend/js");
const CSS = path.join(__dirname, "../../frontend/css");

app.use(express.static(PUBLIC));      // html
app.use("/js", express.static(JS));   // js
app.use("/css", express.static(CSS)); 


app.get("/", (req, res) => {
    res.send(`
        <h1>Racetrack Interfaces</h1>
        <ul>
            <li><a href="/front-desk">Front Desk</a></li>
            <li><a href="/lap-line-tracker">Lap Line Tracker</a></li>
            <li><a href="/leader-board">Leader Board</a></li>
            <li><a href="/next-race">Next Race</a></li>
            <li><a href="/race-control">Race Control</a></li>
            <li><a href="/race-countdown">Race Countdown</a></li>
            <li><a href="/race-flags">Race Flags</a></li>
        </ul>
    `);
});

const pages = {
  "/front-desk": "front-desk.html",
  "/lap-line-tracker": "lap-line-tracker.html",
  "/leader-board": "leader-board.html",
  "/next-race": "next-race.html",
  "/race-control": "race-control.html",
  "/race-countdown": "race-countdown.html",
  "/race-flags": "race-flags.html",
};

for (const [route, file] of Object.entries(pages)) {
  app.get(route, (req, res) => res.sendFile(path.join(PUBLIC, file)));
}

// KEY VERIFICATION
io.use((socket, next) => {
    const user_key = socket.handshake.auth.key;
    const role = socket.handshake.auth.role;
    switch (role) {
        case "front-desk":
            if (user_key === RECEPTIONIST_KEY) {
                console.log(`${role}: correct access key`)
                next();
            } else {
                setTimeout(() => {
                    next(new Error(`${role}: invalid access key`));
                }, 500)
            }
            break;
        case "race-control":
            if (user_key === SAFETY_KEY) {
                console.log(`${role}: correct access key`)
                next();
            } else {
                setTimeout(() => {
                    next(new Error(`${role}: invalid access key`));
                }, 500)
            }
            break;
        case "lap-line-tracker":
            if (user_key === OBSERVER_KEY) {
                console.log(`${role}:correct access key`)
                next();
            } else {
                setTimeout(() => {
                    next(new Error(`${role}: invalid access key`));
                }, 500)
            }
            break;
        default:
            next();
    }
})

io.on("connection", (socket) => {
    console.log(`${socket.id} connected: ${ socket.handshake.auth?.role }`);
    socket.on("ping", (pong) => console.log(pong));
    socket.on("disconnect", (reason) => console.log(`${socket.id} disconnected, reason: ${reason}`));
});


server.listen(PORT, HOST, () => {
    console.log(`Server is running at: ${HOST}:${PORT}`);
});

