// overlay
const overlay = document.createElement("div");
overlay.className = "login-overlay";

// box
const box = document.createElement("div");
box.className = "login-box";

// title
const title = document.createElement("h2");
title.textContent = "Access Key Required";

// input
const input = document.createElement("input");
input.type = "password";
input.placeholder = "Enter access key";

// button
const button = document.createElement("button");
button.textContent = "Unlock";

// error
const error = document.createElement("p");
error.className = "error";

// assemble
box.append(title, input, button, error);
overlay.appendChild(box);
document.body.appendChild(overlay);
