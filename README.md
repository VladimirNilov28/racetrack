# Racetrack Info-Screens

This is a full-stack application for managing and displaying real-time racetrack information at Beachside Racetrack. The project features a Node.js/Express backend with Socket.io for real-time orchestration and a Vanilla JS frontend.

## Prerequisites

- **Node.js**: Version 18.x or higher is recommended.
- **npm**: Node Package Manager.

## Configuration & Security

To protect employee interfaces, the server requires access keys to be set as environment variables before starting. If these keys are not provided, the server will intentionally fail to start and display a usage error.

Create a `.env` file in the root directory or export the following variables in your terminal:

```bash
export RECEPTIONIST_KEY=<your key>
export SAFETY_KEY=<your key>
export OBSERVER_KEY=<your key>

# Optional overrides:
export PORT=8080
export SQLITE_FILE=db.sqlite
```

_(Note: If an incorrect key is provided by the client, the server enforces a 500ms delay before responding to prevent brute-force attacks)._

## Installation & Launch

1. Clone the repository and navigate to the root directory.
2. Install the required dependencies:

```bash
npm install
```

### Development Mode (1-minute races)

Starts the server with hot-reloading (using `nodemon`). In this mode, race timers are shortened to **1 minute** for testing purposes.

```bash
npm run dev
```

### Production Mode (10-minute races)

Launches the project in a production environment. Race timers are set to the standard **10 minutes**.

```bash
npm start
```

## Running Tests

This project uses `vitest` for testing. To execute the test suite, run:

```bash
npm test
```

---

## User Guide

Once the server is running, the application is accessible at `http://localhost:8080/` (or your configured port).

### Employee Interfaces (Require Access Keys)

#### 1. Front Desk (`/front-desk`)

- **Access Key:** `RECEPTIONIST_KEY`
- **Usage:** [TODO: Frontend dev - describe how the Receptionist configures races, adds drivers, etc.]
- **Screenshot:** > `[TODO: Frontend dev - Insert screenshot of Front Desk here]`

#### 2. Race Control (`/race-control`)

- **Access Key:** `SAFETY_KEY`
- **Usage:** [TODO: Frontend dev - describe how the Safety Official starts/finishes races and controls flags]
- **Screenshot:** > `[TODO: Frontend dev - Insert screenshot of Race Control here]`

#### 3. Lap-line Tracker (`/lap-line-tracker`)

- **Access Key:** `OBSERVER_KEY`
- **Usage:** [TODO: Frontend dev - describe how the Observer records lap times]
- **Screenshot:** > `[TODO: Frontend dev - Insert screenshot of Lap-line Tracker here]`

### Public Displays (No Key Required)

_(These screens feature a button to launch in full-screen mode)_

- **Leader Board (`/leader-board`):** [TODO: Frontend dev - add brief description of the real-time ranking view]
- **Next Race (`/next-race`):** [TODO: Frontend dev - add brief description of the upcoming roster view]
- **Race Flags (`/race-flags`):** [TODO: Frontend dev - add brief description of the full-screen flag indicators]
- **Race Countdown (`/race-countdown`):** [TODO: Frontend dev - add brief description of the timer screen]
