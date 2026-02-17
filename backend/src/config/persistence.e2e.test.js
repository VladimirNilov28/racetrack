// src/config/persistence.e2e.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url"; // Добавлено для корректной работы путей

import { io as ioClient } from "socket.io-client";

// Windows требует больше времени на I/O и запуск процессов
vi.setConfig({ testTimeout: 30000 });

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// --- ХЕЛПЕР ДЛЯ WINDOWS: Удаление файла с повторными попытками ---
// Windows часто выдает EBUSY или EPERM, если антивирус проверяет файл
// или процесс еще не до конца отпустил хендл.
async function forceDeleteFile(filePath) {
  for (let i = 0; i < 10; i++) {
    try {
      await fs.rm(filePath, { recursive: true, force: true });
      return; // Успех
    } catch (e) {
      if (e.code === "EBUSY" || e.code === "EPERM") {
        await sleep(200); // Ждем и пробуем снова
        continue;
      }
      throw e; // Другая ошибка
    }
  }
}

async function waitForServerUp({ port, timeoutMs = 8000 }) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.connect({ host: "127.0.0.1", port }, () => {
          socket.end();
          resolve();
        });
        socket.on("error", reject);
      });
      return;
    } catch {
      await sleep(100);
    }
  }
  throw new Error(`Server did not start on port ${port} within ${timeoutMs}ms`);
}

function testDirname() {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

function startServer({ port, sqliteFile }) {
  const backendRoot = path.resolve(testDirname(), "../..");
  const serverEntry = path.join(backendRoot, "src", "server.js");

  // На Windows важно явно вызывать node.exe (process.execPath)
  const child = spawn(process.execPath, [serverEntry, "--no-keycheck"], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: String(port),
      SQLITE_FILE: sqliteFile,
    },
    // 'pipe' нужен чтобы мы могли перехватить логи, если что-то упадет
    stdio: ["ignore", "pipe", "pipe"],
    // Для Windows: detached=false (по умолчанию), чтобы процесс был привязан к родителю
    windowsHide: true,
  });

  const logs = { out: "", err: "" };
  child.stdout.on("data", (d) => (logs.out += d.toString()));
  child.stderr.on("data", (d) => (logs.err += d.toString()));

  return { child, logs };
}

async function stopServer(child) {
  if (!child || child.killed || child.exitCode !== null) return;

  return new Promise((resolve) => {
    let killed = false;

    // Таймер принудительного убийства (если SIGINT не сработал)
    const t = setTimeout(() => {
      if (!killed) {
        try {
          // На Windows tree-kill часто надежнее, но для child_process spawn
          // обычно работает .kill() если процесс не spawn-ул внуков.
          child.kill("SIGKILL");
        } catch {}
      }
    }, 3000);

    child.once("exit", () => {
      killed = true;
      clearTimeout(t);
      resolve();
    });

    // На Windows SIGINT эмулируется, но иногда Node процесс не успевает закрыться грациозно.
    // Если сервер висит в нативном коде (sqlite), он может не поймать сигнал сразу.
    try {
      child.kill("SIGINT");
    } catch {
      clearTimeout(t);
      resolve();
    }
  });
}

function connectClient({ port }) {
  return ioClient(`http://127.0.0.1:${port}`, {
    transports: ["websocket"],
    timeout: 5000,
    reconnection: false,
    forceNew: true, // Важно для тестов
  });
}

async function waitForConnect(socket, timeoutMs = 5000) {
  if (socket.connected) return;

  await new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      cleanup();
      reject(new Error("Socket connect timeout"));
    }, timeoutMs);

    function onOk() {
      cleanup();
      resolve();
    }
    function onErr(err) {
      cleanup();
      reject(err);
    }
    function cleanup() {
      clearTimeout(t);
      socket.off("connect", onOk);
      socket.off("connect_error", onErr);
    }

    socket.on("connect", onOk);
    socket.on("connect_error", onErr);
  });
}

async function emitCmdExpectOk(socket, eventName, payload) {
  return new Promise((resolve, reject) => {
    // Добавим таймаут на саму команду, чтобы тест не вис наглухо
    const t = setTimeout(
      () => reject(new Error(`Timeout waiting for ack: ${eventName}`)),
      2000,
    );

    socket.emit(eventName, payload, (ack) => {
      clearTimeout(t);
      if (!ack?.ok) {
        reject(
          new Error(`Command failed: ${eventName} ack=${JSON.stringify(ack)}`),
        );
      } else {
        resolve(ack.state);
      }
    });
  });
}

function findSession(state, id) {
  const cur = state?.sessions?.current ?? null;
  const upcoming = state?.sessions?.upcoming ?? [];
  const all = [cur, ...upcoming].filter(Boolean);
  return all.find((s) => s.id === id) ?? null;
}

let tmpDir;
let sqliteFile;

beforeEach(async () => {
  // Создаем временную папку. На Windows лучше использовать os.tmpdir()
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "racetrack-e2e-"));
  sqliteFile = path.join(tmpDir, "db.sqlite");
});

afterEach(async () => {
  // Используем наш безопасный удалятор
  await forceDeleteFile(tmpDir);
});

describe("persistence e2e (client-like + restart)", () => {
  it("restores state after server restart (SQLite snapshot)", async () => {
    const port = await getFreePort();

    // --- start server #1 ---
    const { child: srv1, logs: logs1 } = startServer({ port, sqliteFile });
    try {
      await waitForServerUp({ port });

      const c1 = connectClient({ port });
      await waitForConnect(c1);

      await emitCmdExpectOk(c1, "cmd:session:add", {
        session: { id: "S1", drivers: [] },
      });

      const stateAfterDriver = await emitCmdExpectOk(c1, "cmd:driver:add", {
        sessionId: "S1",
        driver: { name: "Max", car: 7 },
      });

      const sess1 = findSession(stateAfterDriver, "S1");
      expect(sess1).toBeTruthy();
      expect(sess1.drivers.some((d) => d.name === "Max" && d.car === 7)).toBe(
        true,
      );
      await sleep(500);
      c1.disconnect();
    } catch (err) {
      console.error("Setup failed (Server 1 logs):", logs1.out, logs1.err);
      throw err;
    } finally {
      await stopServer(srv1);
      // !!! WINDOWS FIX: Даем системе время освободить файл БД перед следующим запуском
      await sleep(300);
    }

    // --- start server #2 (same sqlite file) ---
    const { child: srv2, logs: logs2 } = startServer({ port, sqliteFile });
    try {
      await waitForServerUp({ port });

      const c2 = connectClient({ port });
      await waitForConnect(c2);

      const restoredState = await emitCmdExpectOk(c2, "cmd:race:set-mode", {
        mode: "safe",
      });

      const sess2 = findSession(restoredState, "S1");
      expect(sess2).toBeTruthy();
      expect(sess2.drivers.some((d) => d.name === "Max" && d.car === 7)).toBe(
        true,
      );

      c2.disconnect();
    } catch (err) {
      console.error(
        "Restoration failed (Server 2 logs):",
        logs2.out,
        logs2.err,
      );
      throw err;
    } finally {
      await stopServer(srv2);
    }
  }, 20000);

  it("acts like 'DB disabled' if SQLite file is removed between restarts (state resets)", async () => {
    const port = await getFreePort();

    // --- start server #1 ---
    const { child: srv1, logs: logs1 } = startServer({ port, sqliteFile });
    try {
      await waitForServerUp({ port });
      const c1 = connectClient({ port });
      await waitForConnect(c1);

      const state1 = await emitCmdExpectOk(c1, "cmd:session:add", {
        session: { id: "S_DB", drivers: [] },
      });

      expect(findSession(state1, "S_DB")).toBeTruthy();
      c1.disconnect();
    } finally {
      await stopServer(srv1);
      await sleep(300); // Windows FIX
    }

    // Simulate "DB off" by removing sqlite file
    // Используем forceDeleteFile, чтобы пережить блокировки
    await forceDeleteFile(sqliteFile);

    // --- start server #2 ---
    const { child: srv2, logs: logs2 } = startServer({ port, sqliteFile });
    try {
      await waitForServerUp({ port });
      const c2 = connectClient({ port });
      await waitForConnect(c2);

      const state2 = await emitCmdExpectOk(c2, "cmd:race:set-mode", {
        mode: "safe",
      });

      expect(findSession(state2, "S_DB")).toBeFalsy();
      c2.disconnect();
    } catch (err) {
      console.error("Reset test failed (Server 2 logs):", logs2.out, logs2.err);
      throw err;
    } finally {
      await stopServer(srv2);
    }
  }, 20000);
});
