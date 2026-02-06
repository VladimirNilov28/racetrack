import { dbGet, dbRun } from "./database.js";

export async function loadState() {
    const row = await dbGet(
        "SELECT state_json FROM state_snapshot WHERE id = 1",
    );
    if (!row) return null;
    return JSON.parse(row.state_json);
}

export async function saveState(state) {
    const json = JSON.stringify(state);
    const now = Date.now();

    await dbRun(
        `INSERT INTO state_snapshot (id, state_json, updated_at)
     VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       state_json = excluded.state_json,
       updated_at = excluded.updated_at`,
        [json, now],
    );
}
