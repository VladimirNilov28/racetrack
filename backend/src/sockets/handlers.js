import logger from "../logger.js"
export function socketConnect(io) {
    
    io.on("connection", (socket) => {
        logger.info(`\x1b[33m${socket.id}\x1b[0m connected to ${ socket.handshake.auth?.role }`);
        // Log all incoming socket events 
        socket.on("*", (packet) => {
            const [eventName, eventData] = packet.data;
            logger.info({
                eventName,
                eventData,
                socketId: socket.id,
            });
        });

        // The origignal socket emiter
        let _emit = socket.emit;

        socket.emit = function () {
            _emit.apply(socket, arguments);
            let { 0: eventName, 1: eventData } = arguments;
            logger.info({
                eventName: `[Emit] ${eventName}`,
                eventData,
                socketId: socket.id,
            });
        };


        // Ping Pong listener, just for testing
        socket.on("ping", (pong) => console.log(pong));


        socket.on("disconnect", (reason) => {
            logger.info(`\x1b[33m${socket.id}\x1b[0m disconnected from ${ socket.handshake.auth?.role }, reason: ${reason}\n`)
        });
    });
}