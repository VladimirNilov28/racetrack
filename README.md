# FRONTEND_SETUP

This guide explains how to set up and run the frontend projects before starting development.

---

## Prerequisites

Make sure you have the following installed:

- Node.js 18 or newer
- npm

Check versions:

```bash
node -v
npm -v
```

---

## 1. Clone the repository

```bash
git clone <repo-url>
cd racetrack
```

---

## 2. Switch to your branch

Choose your personal frontend branch:

```bash
git checkout front/<your-nickname>
git pull
```

---

## 3. Install dependencies

Go to your frontend project directory.

For Admin Control:

```bash
cd admin-control
npm install
```

For User Display:

```bash
cd user-display
npm install
```

---

## 4. Environment configuration

Create a `.env` file inside your frontend directory:

```env
VITE_SOCKET_URL=http://localhost:3000
```

Do not commit this file.

---

## 5. Start development server

```bash
npm run dev
```

The frontend will be available at:

- http://localhost:5173
- http://localhost:5174

(depending on the project)

---

## Notes

- Backend must be running to receive realtime data
- Do not commit `node_modules`
- Do not commit `.env`

---

You are now ready to work on the frontend.