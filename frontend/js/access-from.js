export function showAccessForm({ title = "Access Key Required", onSubmit }) {
  // overlay
  const overlay = document.createElement("div");
  overlay.className = "login-overlay";

  // box
  const box = document.createElement("div");
  box.className = "login-box";

  // title
  const h2 = document.createElement("h2");
  h2.textContent = title;

  // input
  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = "Enter access key";

  // button
  const button = document.createElement("button");
  button.textContent = "Unlock";

  // error
  const error = document.createElement("div");
  error.className = "error";

  button.addEventListener("click", () => {
    const key = input.value.trim();

    if (!key) {
      error.textContent = "Key is required";
      return;
    }

    error.textContent = "";
    onSubmit(key);
  });

  box.append(h2, input, button, error);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  return {
    close() {
      overlay.remove();
    },
    showError(message) {
      error.textContent = message;
    }
  };
}
