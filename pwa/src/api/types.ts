// ── TypeScript interfaces matching backend JSON payloads ──

export type LicenseType =
  | 'CC-BY'
  | 'CC-BY-SA'
  | 'CC-BY-NC'
  | 'CC-BY-NC-SA'
  | 'CC-BY-ND'
  | 'CC-BY-NC-ND'
  | 'CC0'
  | 'PD'
  | 'ALL_RIGHTS';

export type MediaType = 'AUDIO' | 'IMAGE' | 'VIDEO' | 'OTHER';

export type ItemType =
  | 'MCQ'
  | 'CLOZE'
  | 'TRUE_FALSE'
  | 'LISTEN_ANSWER'
  | 'SPEAK_REPEAT';

export type AttemptResult = 'CORRECT' | 'INCORRECT' | 'PARTIAL';

export interface ContentUnit {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  level: string;
  license_type: LicenseType;
  source_url: string | null;
  created_by: string;
  variants: ContentVariant[];
  media: MediaResource[];
  items: Item[];
  created_at: string;
  updated_at: string;
}

export interface ContentVariant {
  id: string;
  content_unit: string;
  language_code: string;
  script: string;
  body: string;
  is_official_translation: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaResource {
  id: string;
  content_unit: string;
  type: MediaType;
  file: string | null;
  url: string | null;
  caption: string | null;
}

export interface Item {
  id: string;
  content_unit: string;
  item_type: ItemType;
  prompt: string;
  metadata: ItemMetadata;
  difficulty_initial: number | null;
  tags: Tag[];
}

export interface ItemMetadata {
  choices?: string[];
  correct_index?: number;
  correct_answer?: string;
  blank_word?: string;
  audio_url?: string;
  [key: string]: unknown;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Attempt {
  id: string;
  learner: string;
  item: string;
  timestamp: string;
  result: AttemptResult;
  response_data: Record<string, unknown>;
  latency_ms: number | null;
  synced?: boolean;
}

export interface ItemState {
  id: string;
  learner: string;
  item: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_due: string;
}

// ── Sync payloads ──

export interface ContentSyncRequest {
  learner_id: string;
  last_sync_at?: string;
  subject?: string;
  level?: string;
  language_code?: string;
}

export interface ContentSyncResponse {
  content_units: ContentUnit[];
  server_sync_time: string;
}

export interface ProgressSyncRequest {
  learner_id: string;
  attempts: Attempt[];
  item_states?: ItemState[];
}

export interface ProgressSyncResponse {
  attempts: Array<{id: string; status: string; errors?: unknown}>;
  item_states: Array<{id: string; status: string; errors?: unknown}>;
  server_sync_time: string;
}
