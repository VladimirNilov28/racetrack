import socket from "./socket.js";

const pingBtn = document.getElementById("ping-btn");

pingBtn.addEventListener("click", () => {
  socket.emit("ping", "pong");
});