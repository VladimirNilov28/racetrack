import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";

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
            <li><a href="/lap-line-tracker">Lap Line Tracker</a></li>
            <li><a href="/leader-board">Leader Board</a></li>
            <li><a href="/next-race">Next Race</a></li>
            <li><a href="/race-control">Race Control</a></li>
            <li><a href="/race-countdown">Race Countdown</a></li>
            <li><a href="/race-flags">Race Flags</a></li>
        </ul>
    `);
});

app.get("/front-desk", (req, res) => {
    res.sendFile(path.join(`${PUBLIC}/front-desk.html`));
});

app.get("/lap-line-tracker", (req, res) => {
    res.sendFile(path.join(`${PUBLIC}/lap-line-tracker.html`));
});

app.get("/leader-board", (req, res) => {
    res.sendFile(path.join(`${PUBLIC}/leader-board.html`));
});

app.get("/next-race", (req, res) => {
    res.sendFile(path.join(`${PUBLIC}/next-race.html`));
});

app.get("/race-control", (req, res) => {
    res.sendFile(path.join(`${PUBLIC}/race-control.html`));
});

app.get("/race-countdown", (req, res) => {
    res.sendFile(path.join(`${PUBLIC}/race-countdown.html`));
});

app.get("/race-flags", (req, res) => {
    res.sendFile(path.join(`${PUBLIC}/race-flags.html`));
});

server.listen(PORT, HOST, () => {
    console.log(`Server is running at: ${HOST}:${PORT}`);
});
