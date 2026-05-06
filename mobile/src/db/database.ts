import SQLite, {
  SQLiteDatabase,
  ResultSet,
} from 'react-native-sqlite-storage';

import {SCHEMA_SQL} from './schema';
import {
  Attempt,
  ContentUnit,
  ContentVariant,
  Item,
  ItemState,
  MediaResource,
} from '../api/types';

SQLite.enablePromise(true);

let db: SQLiteDatabase | null = null;

/** Open (or create) the database and run migrations. */
export async function openDatabase(): Promise<SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabase({
    name: 'learnify.db',
    location: 'default',
  });

  await db.executeSql(SCHEMA_SQL);
  return db;
}

/** Get the current database instance. Throws if not opened. */
export function getDb(): SQLiteDatabase {
  if (!db) throw new Error('Database not opened. Call openDatabase() first.');
  return db;
}

// ── Sync state ──

export async function getLastContentSyncTime(): Promise<string | null> {
  const [results] = await getDb().executeSql(
    'SELECT last_content_sync FROM sync_state WHERE id = 1',
  );
  return results.rows.item(0)?.last_content_sync ?? null;
}

export async function getLastProgressSyncTime(): Promise<string | null> {
  const [results] = await getDb().executeSql(
    'SELECT last_progress_sync FROM sync_state WHERE id = 1',
  );
  return results.rows.item(0)?.last_progress_sync ?? null;
}

export async function setLastContentSyncTime(ts: string): Promise<void> {
  await getDb().executeSql(
    'UPDATE sync_state SET last_content_sync = ? WHERE id = 1',
    [ts],
  );
}

export async function setLastProgressSyncTime(ts: string): Promise<void> {
  await getDb().executeSql(
    'UPDATE sync_state SET last_progress_sync = ? WHERE id = 1',
    [ts],
  );
}

// ── Content upserts ──

export async function upsertContentUnit(unit: ContentUnit): Promise<void> {
  const db = getDb();
  await db.executeSql(
    `INSERT OR REPLACE INTO content_units
      (id, title, description, subject, level, license_type, source_url, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      unit.id, unit.title, unit.description, unit.subject, unit.level,
      unit.license_type, unit.source_url, unit.created_by,
      unit.created_at, unit.updated_at,
    ],
  );

  for (const v of unit.variants ?? []) {
    await db.executeSql(
      `INSERT OR REPLACE INTO content_variants
        (id, content_unit_id, language_code, script, body, is_official_translation, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        v.id, unit.id, v.language_code, v.script, v.body,
        v.is_official_translation ? 1 : 0, v.created_at, v.updated_at,
      ],
    );
  }

  for (const m of unit.media ?? []) {
    await db.executeSql(
      `INSERT OR REPLACE INTO media_resources
        (id, content_unit_id, type, file, url, caption)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [m.id, unit.id, m.type, m.file, m.url, m.caption],
    );
  }

  for (const item of unit.items ?? []) {
    await db.executeSql(
      `INSERT OR REPLACE INTO items
        (id, content_unit_id, item_type, prompt, metadata, difficulty_initial)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item.id, unit.id, item.item_type, item.prompt,
        JSON.stringify(item.metadata), item.difficulty_initial,
      ],
    );
  }
}

// ── Learner ──

export async function ensureLearner(learnerId: string): Promise<void> {
  await getDb().executeSql(
    'INSERT OR IGNORE INTO learners (id) VALUES (?)',
    [learnerId],
  );
}

// ── Attempts with offline flag ──

export async function saveAttempt(attempt: Attempt): Promise<void> {
  await getDb().executeSql(
    `INSERT OR REPLACE INTO attempts
      (id, learner_id, item_id, timestamp, result, response_data, latency_ms, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      attempt.id, attempt.learner, attempt.item, attempt.timestamp,
      attempt.result, JSON.stringify(attempt.response_data),
      attempt.latency_ms, attempt.synced ? 1 : 0,
    ],
  );
}

export async function getUnsyncedAttempts(learnerId: string): Promise<Attempt[]> {
  const [results] = await getDb().executeSql(
    'SELECT * FROM attempts WHERE learner_id = ? AND synced = 0 ORDER BY timestamp',
    [learnerId],
  );
  const rows: Attempt[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const r = results.rows.item(i);
    rows.push({
      id: r.id,
      learner: r.learner_id,
      item: r.item_id,
      timestamp: r.timestamp,
      result: r.result,
      response_data: JSON.parse(r.response_data),
      latency_ms: r.latency_ms,
      synced: r.synced === 1,
    });
  }
  return rows;
}

export async function markAttemptsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await getDb().executeSql(
    `UPDATE attempts SET synced = 1 WHERE id IN (${placeholders})`,
    ids,
  );
}

// ── Item states ──

export async function upsertItemState(state: ItemState): Promise<void> {
  await getDb().executeSql(
    `INSERT OR REPLACE INTO item_states
      (id, learner_id, item_id, ease_factor, interval_days, repetitions, next_due)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      state.id, state.learner, state.item,
      state.ease_factor, state.interval_days, state.repetitions, state.next_due,
    ],
  );
}

/** Load item states for a learner, ordered by next_due ascending. */
export async function getItemStates(learnerId: string): Promise<ItemState[]> {
  const [results] = await getDb().executeSql(
    'SELECT * FROM item_states WHERE learner_id = ? ORDER BY next_due ASC',
    [learnerId],
  );
  const rows: ItemState[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const r = results.rows.item(i);
    rows.push({
      id: r.id,
      learner: r.learner_id,
      item: r.item_id,
      ease_factor: r.ease_factor,
      interval_days: r.interval_days,
      repetitions: r.repetitions,
      next_due: r.next_due,
    });
  }
  return rows;
}

/** Load all items (for fallback when no item states exist). */
export async function getAllItems(): Promise<Item[]> {
  const [results] = await getDb().executeSql('SELECT * FROM items');
  const rows: Item[] = [];
  for (let i = 0; i < results.rows.length; i++) {
    const r = results.rows.item(i);
    rows.push({
      id: r.id,
      content_unit: r.content_unit_id,
      item_type: r.item_type,
      prompt: r.prompt,
      metadata: JSON.parse(r.metadata),
      difficulty_initial: r.difficulty_initial,
      tags: [],
    });
  }
  return rows;
}
