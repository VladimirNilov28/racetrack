import express from "express";
import { createServer } from "node:http";
import { env } from "node:process";
import { Server } from "socket.io";

const PORT = env.PORT || 8080;
const HOST = env.HOST || "localhost";

const app = express();
const server = createServer(app);
const io = new Server(server, {
    connectionStateRecovery: {}
});

app.get("/", (req, res) => {
    res.end("OK: Server is running");
});

server.listen(PORT, HOST, () => {
    console.log(`Server is running at: ${HOST}:${PORT}`);
});
