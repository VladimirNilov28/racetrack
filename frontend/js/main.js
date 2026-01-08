/**
 * @file main.js
 * @description
 * Global frontend bootstrap for all Racetrack Info-Screens pages.
 *
 * Responsibilities:
 * 1) Detect the current page role from URL path (e.g. "/leader-board" -> "leader-board").
 * 2) Enforce access key flow for employee-only pages:
 *    - front-desk
 *    - race-control
 *    - lap-line-tracker
 * 3) Use a shared Socket.IO client instance (`socket`) and provide the auth key:
 *    - Employee pages: prompt user for access key, then connect with `socket.auth.key = <key>`.
 *    - Public pages: auto-connect with `socket.auth.key = "public"`.
 * 4) Provide a small ping/pong smoke test via an optional button with id "ping-btn".
 *
 * Notes for contributors:
 * - Do NOT put page-specific rendering logic here.
 *   Each page should have its own script (e.g. "leader-board.js") that imports the same socket and
 *   subscribes to page-specific events.
 * - This file should remain lightweight and stable so frontend work can progress in parallel with backend.
 *
 * Expected server behavior (contract assumptions):
 * - If an invalid access key is provided, the server rejects the connection and triggers "connect_error".
 *   The UI will show an error and allow retry.
 * - For public pages, the key "public" is accepted.
 *
 * @module main
 */

import socket from "./socket.js";
import { showAccessForm } from "./access-form.js";

const role = location.pathname.slice(1);

const employeeRoles = new Set(["front-desk", "race-control", "lap-line-tracker"]);

// Auth form initialization
if (employeeRoles.has(role)) {
    const form = showAccessForm({
        title: "Access Key Required",
        onSubmit(key) {
            socket.auth = { key, role };
            socket.connect();
        },
    });

    socket.on("connect", () => {
        form.close();
    });

    socket.on("connect_error", (err) => {
        if (err?.data?.code === "INVALID_ACCESS_KEY" || err?.message === "INVALID_ACCESS_KEY") {
            form.showError("Invalid access key");
        } else {
            form.showError("Connection error");
        }
    });
} else {
    socket.auth = { key: null , role };
    socket.connect();
}

// PING PONG TEST (if button exist, just server connection test)
const pingBtn = document.getElementById("ping-btn");
if (pingBtn) {
    pingBtn.addEventListener("click", () => {
        socket.emit("ping", "pong");
    });
    socket.on("pong", () => {
        console.log("pong")
    })
}
