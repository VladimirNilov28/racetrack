import path from "node:path";
import { fileURLToPath } from "node:url";
import logger from "../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// path to frontend/public
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
  // index - FIX: Serve the actual index.html file
  app.get("/", (req, res) => {
    logger.info("http:page:serve", {
      route: "/",
      ip: req.ip,
    });

    // This makes the server load your new HTML file
    res.sendFile(path.join(PUBLIC, "index.html"));
  });

  // other pages (Keep this as is)
  for (const [route, file] of Object.entries(pages)) {
    app.get(route, (req, res) => {
      logger.info("http:page:serve", {
        route,
        file,
        ip: req.ip,
      });

      res.sendFile(path.join(PUBLIC, file));
    });
  }

  logger.info("http:pages:registered", {
    count: Object.keys(pages).length + 1, // + index
  });
}
