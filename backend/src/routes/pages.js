import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// путь до frontend/public
const PUBLIC = path.join(__dirname, "../../../frontend/public");

const pages = {
  "/front-desk": "front-desk.html",
  "/lap-line-tracker": "lap-line-tracker.html",
  "/leader-board": "leader-board.html",
  "/next-race": "next-race.html",
  "/race-control": "race-control.html",
  "/race-countdown": "race-countdown.html",
  "/race-flags": "race-flags.html",
};

export function registerPages(app) {
  // index
  app.get("/", (req, res) => {
    res.send(`
      <h1>Racetrack Interfaces</h1>
      <ul>
        <li><a href="/front-desk">Front Desk</a> (Secured)</li>
        <li><a href="/lap-line-tracker">Lap Line Tracker</a> (Secured)</li>
        <li><a href="/leader-board">Leader Board</a></li>
        <li><a href="/next-race">Next Race</a></li>
        <li><a href="/race-control">Race Control</a> (Secured)</li>
        <li><a href="/race-countdown">Race Countdown</a></li>
        <li><a href="/race-flags">Race Flags</a></li>
      </ul>
    `);
  });

  // остальные страницы
  for (const [route, file] of Object.entries(pages)) {
    app.get(route, (req, res) => {
      res.sendFile(path.join(PUBLIC, file));
    });
  }
}
