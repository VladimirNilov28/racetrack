import socket from "./socket.js";
import { showAccessForm } from "./access-from.js"

const role = location.pathname.slice(1);


if (role === "front-desk" || role === "race-control" || role === "lap-line-tracker") {
    const form = showAccessForm({
        title: "Access Key Required",
        onSubmit(key) {
            socket.auth.key = key;
            socket.connect();
        }
    });

    socket.on("connect", () => {
        form.close();
    });

    socket.on("connect_error", () => {
        form.showError("Invalid access key");
    });
} else {
    socket.auth.key = "public";
    socket.connect();
}






//PING PONG TEST
const pingBtn = document.getElementById("ping-btn");

pingBtn.addEventListener("click", () => {
  socket.emit("ping", "pong");
});

