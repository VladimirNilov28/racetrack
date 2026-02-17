// src/persistence/database.js
import sqlite3 from "sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DB_FILE = path.resolve(__dirname, "../../db.sqlite");

let db = null;

function notInit() {
  return Promise.reject(new Error("db not initialized"));
}

export async function dbInit({ filename = DEFAULT_DB_FILE } = {}) {
  if (db) return;

  await fs.mkdir(path.dirname(filename), { recursive: true });

  // ШАГ 1: Открываем соединение через Promise, чтобы поймать ошибки открытия
  db = await new Promise((resolve, reject) => {
    const _db = new sqlite3.Database(filename, (err) => {
      if (err) reject(err);
      else resolve(_db);
    });
  });

  // ШАГ 2: Создаем таблицы. Если ошибка — закрываем и обнуляем db!
  try {
    await dbExec(`
      CREATE TABLE IF NOT EXISTS state_snapshot (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        state_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  } catch (err) {
    // Важно: если не удалось создать таблицы, закрываем соединение,
    // чтобы не оставить "сломанный" инстанс и заблокированный файл.
    await dbClose();
    throw err;
  }
}

// ... dbGet, dbAll, dbRun, dbExec оставляем как есть ...
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
// ...

export async function dbClose() {
  if (!db) return;

  await new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  db = null;
}
