export function pingPong(io) {
    io.on("connection", (socket) => {
        console.log(`\x1b[33m${socket.id}\x1b[0m connected to ${ socket.handshake.auth?.role }`);
        socket.on("ping", (pong) => console.log(pong));
        socket.on("disconnect", (reason) => console.log(`\x1b[33m${socket.id}\x1b[0m disconnected from ${ socket.handshake.auth?.role }, reason: ${reason}\n`));
    });
}