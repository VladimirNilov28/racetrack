// src/config/database.js (или где у тебя лежит)
import sqlite3 from "sqlite3";
import path from "node:path";

let db = null;

function notInit() {
    return Promise.reject(new Error("db not initialized"));
}

export async function dbInit({ filename = "backend/db.sqlite" } = {}) {
    if (db) return;

    const file = path.resolve(filename);
    db = new sqlite3.Database(file);

    await dbExec(`
    CREATE TABLE IF NOT EXISTS state_snapshot (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      state_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

export function dbGet(sql, params = []) {
    if (!db) return notInit();
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}

export function dbAll(sql, params = []) {
    if (!db) return notInit();
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

export function dbRun(sql, params = []) {
    if (!db) return notInit();
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

export function dbExec(sql) {
    if (!db) return notInit();
    return new Promise((resolve, reject) => {
        db.exec(sql, (err) => (err ? reject(err) : resolve()));
    });
}

export async function dbClose() {
    if (!db) return;
    await new Promise((resolve, reject) => {
        db.close((err) => (err ? reject(err) : resolve()));
    });
    db = null;
}
