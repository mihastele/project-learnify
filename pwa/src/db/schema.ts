/**
 * IndexedDB schema — mirrors the Django backend models.
 * Each table becomes an object store with appropriate key paths and indexes.
 */

export const DB_NAME = 'learnify';
export const DB_VERSION = 1;

export const STORES = {
  CONTENT_UNITS: 'content_units',
  CONTENT_VARIANTS: 'content_variants',
  MEDIA_RESOURCES: 'media_resources',
  ITEMS: 'items',
  LEARNERS: 'learners',
  ATTEMPTS: 'attempts',
  ITEM_STATES: 'item_states',
  SYNC_STATE: 'sync_state',
} as const;

export function upgradeDatabase(db: IDBDatabase): void {
  // ── Content ──
  if (!db.objectStoreNames.contains(STORES.CONTENT_UNITS)) {
    const store = db.createObjectStore(STORES.CONTENT_UNITS, {keyPath: 'id'});
    store.createIndex('idx_subject', 'subject', {unique: false});
    store.createIndex('idx_level', 'level', {unique: false});
  }

  if (!db.objectStoreNames.contains(STORES.CONTENT_VARIANTS)) {
    const store = db.createObjectStore(STORES.CONTENT_VARIANTS, {keyPath: 'id'});
    store.createIndex('idx_content_unit', 'content_unit_id', {unique: false});
    store.createIndex('idx_lang', 'language_code', {unique: false});
  }

  if (!db.objectStoreNames.contains(STORES.MEDIA_RESOURCES)) {
    const store = db.createObjectStore(STORES.MEDIA_RESOURCES, {keyPath: 'id'});
    store.createIndex('idx_content_unit', 'content_unit_id', {unique: false});
  }

  if (!db.objectStoreNames.contains(STORES.ITEMS)) {
    const store = db.createObjectStore(STORES.ITEMS, {keyPath: 'id'});
    store.createIndex('idx_content_unit', 'content_unit_id', {unique: false});
  }

  // ── Learning ──
  if (!db.objectStoreNames.contains(STORES.LEARNERS)) {
    db.createObjectStore(STORES.LEARNERS, {keyPath: 'id'});
  }

  if (!db.objectStoreNames.contains(STORES.ATTEMPTS)) {
    const store = db.createObjectStore(STORES.ATTEMPTS, {keyPath: 'id'});
    store.createIndex('idx_learner_ts', ['learner_id', 'timestamp'], {unique: false});
    store.createIndex('idx_synced', 'synced', {unique: false});
  }

  if (!db.objectStoreNames.contains(STORES.ITEM_STATES)) {
    const store = db.createObjectStore(STORES.ITEM_STATES, {keyPath: 'id'});
    store.createIndex('idx_learner_next_due', ['learner_id', 'next_due'], {unique: false});
    store.createIndex('idx_learner_item', ['learner_id', 'item_id'], {unique: true});
  }

  // ── Sync tracking ──
  if (!db.objectStoreNames.contains(STORES.SYNC_STATE)) {
    db.createObjectStore(STORES.SYNC_STATE, {keyPath: 'id'});
  }
}
