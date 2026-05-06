import {openDB, IDBPDatabase} from 'idb';

import {DB_NAME, DB_VERSION, STORES, upgradeDatabase} from './schema';
import {
  Attempt,
  ContentUnit,
  Item,
  ItemState,
} from '../api/types';

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function openDatabase(): Promise<IDBPDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db: unknown) {
      upgradeDatabase(db as IDBDatabase);
    },
  });

  // Ensure sync_state has a row.
  const db = await dbPromise;
  const existing = await db.get(STORES.SYNC_STATE, 1);
  if (!existing) {
    await db.put(STORES.SYNC_STATE, {
      id: 1,
      last_content_sync: null,
      last_progress_sync: null,
    });
  }

  return db;
}

export async function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) throw new Error('Database not opened. Call openDatabase() first.');
  return dbPromise;
}

// ── Sync state ──

export async function getLastContentSyncTime(): Promise<string | null> {
  const db = await getDb();
  const row = await db.get(STORES.SYNC_STATE, 1);
  return row?.last_content_sync ?? null;
}

export async function getLastProgressSyncTime(): Promise<string | null> {
  const db = await getDb();
  const row = await db.get(STORES.SYNC_STATE, 1);
  return row?.last_progress_sync ?? null;
}

export async function setLastContentSyncTime(ts: string): Promise<void> {
  const db = await getDb();
  const row = await db.get(STORES.SYNC_STATE, 1);
  await db.put(STORES.SYNC_STATE, {
    ...(row ?? {id: 1}),
    id: 1,
    last_content_sync: ts,
  });
}

export async function setLastProgressSyncTime(ts: string): Promise<void> {
  const db = await getDb();
  const row = await db.get(STORES.SYNC_STATE, 1);
  await db.put(STORES.SYNC_STATE, {
    ...(row ?? {id: 1}),
    id: 1,
    last_progress_sync: ts,
  });
}

// ── Content upsert ──

export async function upsertContentUnit(unit: ContentUnit): Promise<void> {
  const db = await getDb();

  // Store the unit itself (omit nested arrays, they go to separate stores).
  const {variants, media, items, ...unitRow} = unit;
  await db.put(STORES.CONTENT_UNITS, unitRow);

  for (const v of unit.variants ?? []) {
    await db.put(STORES.CONTENT_VARIANTS, v);
  }

  for (const m of unit.media ?? []) {
    await db.put(STORES.MEDIA_RESOURCES, m);
  }

  for (const item of unit.items ?? []) {
    // Store metadata as a JSON field to match the SQLite schema convention.
    await db.put(STORES.ITEMS, {
      ...item,
      metadata: typeof item.metadata === 'string'
        ? item.metadata
        : JSON.stringify(item.metadata),
      tags: undefined, // tags stored as-is if needed; keeping simple for sync
    });
  }
}

// ── Learner ──

export async function ensureLearner(learnerId: string): Promise<void> {
  const db = await getDb();
  const existing = await db.get(STORES.LEARNERS, learnerId);
  if (!existing) {
    await db.put(STORES.LEARNERS, {
      id: learnerId,
      created_at: new Date().toISOString(),
    });
  }
}

// ── Attempts with offline flag ──

export async function saveAttempt(attempt: Attempt): Promise<void> {
  const db = await getDb();
  await db.put(STORES.ATTEMPTS, {
    id: attempt.id,
    learner_id: attempt.learner,
    item_id: attempt.item,
    timestamp: attempt.timestamp,
    result: attempt.result,
    response_data: JSON.stringify(attempt.response_data),
    latency_ms: attempt.latency_ms,
    synced: attempt.synced ? 1 : 0,
  });
}

export async function getUnsyncedAttempts(learnerId: string): Promise<Attempt[]> {
  const db = await getDb();
  const all = await db.getAll(STORES.ATTEMPTS);
  const rows: Attempt[] = [];
  for (const r of all) {
    if (r.learner_id === learnerId && r.synced === 0) {
      rows.push({
        id: r.id,
        learner: r.learner_id,
        item: r.item_id,
        timestamp: r.timestamp,
        result: r.result,
        response_data: typeof r.response_data === 'string'
          ? JSON.parse(r.response_data)
          : r.response_data,
        latency_ms: r.latency_ms,
        synced: r.synced === 1,
      });
    }
  }
  rows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return rows;
}

export async function markAttemptsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const tx = db.transaction(STORES.ATTEMPTS, 'readwrite');
  for (const id of ids) {
    const attempt = await tx.store.get(id);
    if (attempt) {
      await tx.store.put({...attempt, synced: 1});
    }
  }
  await tx.done;
}

// ── Item states ──

export async function upsertItemState(state: ItemState): Promise<void> {
  const db = await getDb();
  // Use the learner_id + item_id unique index to find existing row.
  const idx = db.transaction(STORES.ITEM_STATES).store.index('idx_learner_item');
  const existing = await idx.get([state.learner, state.item]);
  const row = {
    id: existing?.id ?? state.id,
    learner_id: state.learner,
    item_id: state.item,
    ease_factor: state.ease_factor,
    interval_days: state.interval_days,
    repetitions: state.repetitions,
    next_due: state.next_due,
  };
  await db.put(STORES.ITEM_STATES, row);
}

export async function getItemStates(learnerId: string): Promise<ItemState[]> {
  const db = await getDb();
  const all = await db.getAll(STORES.ITEM_STATES);
  return all
    .filter(r => r.learner_id === learnerId)
    .sort((a, b) => a.next_due.localeCompare(b.next_due))
    .map(r => ({
      id: r.id,
      learner: r.learner_id,
      item: r.item_id,
      ease_factor: r.ease_factor,
      interval_days: r.interval_days,
      repetitions: r.repetitions,
      next_due: r.next_due,
    }));
}

export async function getAllItems(): Promise<Item[]> {
  const db = await getDb();
  const all = await db.getAll(STORES.ITEMS);
  return all.map(r => ({
    id: r.id,
    content_unit: r.content_unit_id ?? r.content_unit,
    item_type: r.item_type,
    prompt: r.prompt,
    metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata,
    difficulty_initial: r.difficulty_initial,
    tags: [],
  }));
}
