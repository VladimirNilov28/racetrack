// src/persistence/database.test.js
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { dbInit, dbGet, dbRun, dbExec, dbClose } from "./database.js";
import { loadState, saveState } from "./state-snapshot.js";

/**
 * This test suite verifies:
 * - db.js async wrappers work (init/get/run/exec/close)
 * - snapshot repo works (saveState/loadState)
 * - db is isolated per test via temp sqlite file
 *
 * IMPORTANT:
 * - These are real sqlite tests (no fake timers needed).
 * - We use a fresh temp DB file for each test.
 */

let tmpDir = null;
let dbFile = null;

async function makeTempDbFile() {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "racetrack-db-"));
  dbFile = path.join(tmpDir, "test.sqlite");
  return dbFile;
}

async function cleanupTemp() {
  // Close DB first to release file locks (Windows friendly)
  await dbClose().catch(() => {});
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
  tmpDir = null;
  dbFile = null;
}

beforeEach(async () => {
  await makeTempDbFile();
});

afterEach(async () => {
  await cleanupTemp();
});

describe("db.js", () => {
  it("throws if querying before dbInit()", async () => {
    await expect(dbGet("SELECT 1")).rejects.toThrow(/not initialized/i);
    await expect(dbExec("SELECT 1")).rejects.toThrow(/not initialized/i);
    await expect(dbRun("SELECT 1")).rejects.toThrow(/not initialized/i);
  });

  it("dbInit() creates the state_snapshot table", async () => {
    await dbInit({ filename: dbFile });

    // Query sqlite schema to confirm table exists
    const row = await dbGet(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='state_snapshot'`
    );

    expect(row?.name).toBe("state_snapshot");
  });

  it("dbRun() supports INSERT and returns changes/lastID", async () => {
    await dbInit({ filename: dbFile });

    await dbExec(`
      CREATE TABLE IF NOT EXISTS t (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        v TEXT NOT NULL
      );
    `);

    const res = await dbRun(`INSERT INTO t (v) VALUES (?)`, ["hello"]);
    expect(res.changes).toBe(1);
    expect(typeof res.lastID).toBe("number");

    const row = await dbGet(`SELECT v FROM t WHERE id = ?`, [res.lastID]);
    expect(row.v).toBe("hello");
  });
});

describe("state-snapshot.js", () => {
  it("loadState() returns null when no snapshot exists", async () => {
    await dbInit({ filename: dbFile });

    const restored = await loadState();
    expect(restored).toBe(null);
  });

  it("saveState() then loadState() round-trips the same object", async () => {
    await dbInit({ filename: dbFile });

    const state = {
      meta: { version: 1, updatedAt: Date.now() },
      sessions: { upcoming: [], current: null, lastResult: null },
      race: { mode: { value: "safe", updatedAt: Date.now() } },
      timer: { status: "idle", startedAt: null, endsAt: null, durationSec: 60 },
    };

    await saveState(state);

    const restored = await loadState();
    expect(restored).toEqual(state);
  });

  it("saveState() overwrites (single-row snapshot with id=1)", async () => {
    await dbInit({ filename: dbFile });

    const a = { meta: { version: 1 }, x: "A" };
    const b = { meta: { version: 2 }, x: "B" };

    await saveState(a);
    await saveState(b);

    const restored = await loadState();
    expect(restored).toEqual(b);

    // Also confirm only one row exists
    const row = await dbGet(`SELECT COUNT(*) as cnt FROM state_snapshot`);
    expect(row.cnt).toBe(1);
  });
});
