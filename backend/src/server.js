import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { RECEPTIONIST_KEY, SAFETY_KEY, OBSERVER_KEY } from "./security/key-auth.js";

const args = process.argv.slice(2);
const info = `
        Usage:
            npm run dev [options]               Run dev mode
        
        Options:
            --help                              Show help
        
        Configure:
            export RECEPTIONIST_KEY=<your key>  Define acess key for /front-desk
            export SAFETY_KEY=<your key>        Define acess key for /race-control
            export OBSERVER_KEY=<your key>      Define acess key for /lap-line-tracker
        `;
if (args.includes("--help")) {
    console.log(info)
}

const PORT = env.PORT || 8080;
const HOST = env.HOST || "localhost";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC = path.join(__dirname,"../../frontend/public");

const app = express();
const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {}
});

app.use(
    express.static(
        path.join(__dirname, PUBLIC)
    )
);


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

server.listen(PORT, HOST, () => {
    console.log(`Server is running at: ${HOST}:${PORT}`);
});

io.on("connection", (socket) => {
    console.log(`${socket.id} connected: ${socket.handshake.auth?.role}`);
    socket.on("ping", (pong) => console.log(pong));
    socket.on("disconnect", (reason) => console.log(`User disconnected: ${socket.id} reason: ${reason}`));

    
});
