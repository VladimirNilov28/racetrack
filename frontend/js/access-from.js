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
  input.setAttribute("aria-label", "Access key");

  // button
  const button = document.createElement("button");
  button.textContent = "Unlock";

  // error
  const error = document.createElement("div");
  error.className = "error";
  error.setAttribute("role", "alert");
  error.setAttribute("aria-live", "polite");

  const handleSubmit = () => {
    const key = input.value.trim();

    if (!key) {
      error.textContent = "Key is required";
      input.focus();
      return;
    }

    error.textContent = "";
    button.disabled = true;
    onSubmit(key);
  };

  button.addEventListener("click", handleSubmit);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSubmit();
  });

  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) return; // prevent closing when clicking box
  });

  box.append(h2, input, button, error);
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  input.focus();

  return {
    close() {
      overlay.remove();
    },
    showError(message) {
      error.textContent = message;
      button.disabled = false;
      input.focus();
    }
  };
}
