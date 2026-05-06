/**
 * SQLite schema definition for the local mobile database.
 *
 * Mirrors the Django backend models so that content can be stored offline
 * and progress can be synced incrementally.
 */

/** SQL executed once on first launch to create all tables and indexes. */
export const SCHEMA_SQL = `
-- ── Content ──
CREATE TABLE IF NOT EXISTS content_units (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  subject       TEXT NOT NULL,
  level         TEXT NOT NULL,
  license_type  TEXT NOT NULL,
  source_url    TEXT,
  created_by    TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_variants (
  id                     TEXT PRIMARY KEY,
  content_unit_id        TEXT NOT NULL,
  language_code          TEXT NOT NULL,
  script                 TEXT NOT NULL DEFAULT 'Latin',
  body                   TEXT NOT NULL,
  is_official_translation INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL,
  FOREIGN KEY (content_unit_id) REFERENCES content_units(id)
);

CREATE TABLE IF NOT EXISTS media_resources (
  id              TEXT PRIMARY KEY,
  content_unit_id TEXT NOT NULL,
  type            TEXT NOT NULL,
  file            TEXT,
  url             TEXT,
  caption         TEXT,
  FOREIGN KEY (content_unit_id) REFERENCES content_units(id)
);

CREATE TABLE IF NOT EXISTS items (
  id                TEXT PRIMARY KEY,
  content_unit_id   TEXT NOT NULL,
  item_type         TEXT NOT NULL,
  prompt            TEXT NOT NULL,
  metadata          TEXT NOT NULL DEFAULT '{}',
  difficulty_initial REAL,
  FOREIGN KEY (content_unit_id) REFERENCES content_units(id)
);

-- ── Learning ──
CREATE TABLE IF NOT EXISTS learners (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attempts (
  id            TEXT PRIMARY KEY,
  learner_id    TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  timestamp     TEXT NOT NULL DEFAULT (datetime('now')),
  result        TEXT NOT NULL,
  response_data TEXT NOT NULL DEFAULT '{}',
  latency_ms    INTEGER,
  synced        INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (learner_id) REFERENCES learners(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS item_states (
  id            TEXT PRIMARY KEY,
  learner_id    TEXT NOT NULL,
  item_id       TEXT NOT NULL,
  ease_factor   REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions   INTEGER NOT NULL DEFAULT 0,
  next_due      TEXT NOT NULL,
  FOREIGN KEY (learner_id) REFERENCES learners(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  UNIQUE(learner_id, item_id)
);

-- ── Sync tracking ──
CREATE TABLE IF NOT EXISTS sync_state (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  last_content_sync  TEXT,
  last_progress_sync TEXT
);

-- Seed the single sync_state row.
INSERT OR IGNORE INTO sync_state (id) VALUES (1);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_attempts_learner_ts ON attempts(learner_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_attempts_unsynced    ON attempts(synced) WHERE synced = 0;
CREATE INDEX IF NOT EXISTS idx_item_states_due      ON item_states(learner_id, next_due);
CREATE INDEX IF NOT EXISTS idx_content_units_subj   ON content_units(subject);
CREATE INDEX IF NOT EXISTS idx_content_units_level  ON content_units(level);
CREATE INDEX IF NOT EXISTS idx_variants_lang        ON content_variants(language_code);
`;
