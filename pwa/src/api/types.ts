// ── TypeScript interfaces matching backend JSON payloads ──

export type LicenseType =
  | 'CC-BY' | 'CC-BY-SA' | 'CC-BY-NC' | 'CC-BY-NC-SA'
  | 'CC-BY-ND' | 'CC-BY-NC-ND' | 'CC0' | 'PD' | 'ALL_RIGHTS';

export type MediaType = 'AUDIO' | 'IMAGE' | 'VIDEO' | 'OTHER';

export type ItemType =
  | 'MCQ' | 'CLOZE' | 'TRUE_FALSE' | 'LISTEN_ANSWER'
  | 'SPEAK_REPEAT' | 'PRONUNCIATION' | 'MATH_INPUT'
  | 'MATCHING' | 'SORTING' | 'DIAGRAM_LABEL' | 'WRITING';

export type SubjectType =
  | 'LANGUAGE' | 'MATH' | 'SCIENCE' | 'HISTORY'
  | 'GEOGRAPHY' | 'ART' | 'MUSIC' | 'CODING' | 'OTHER';

export type AttemptResult = 'CORRECT' | 'INCORRECT' | 'PARTIAL';

// ── Content ──

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

export interface ContentUnitList {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  level: string;
  license_type: LicenseType;
  source_url: string | null;
  item_count: number;
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
  hint: string | null;
  metadata: ItemMetadata;
  difficulty_initial: number | null;
  sort_order: number;
  points: number;
  tag_ids?: string[];
}

export interface ItemMetadata {
  // MCQ
  choices?: string[];
  correct_index?: number;
  // CLOZE / LISTEN_ANSWER
  correct_answer?: string;
  blank_word?: string;
  // LISTEN_ANSWER / PRONUNCIATION
  audio_url?: string;
  // PRONUNCIATION
  target_text?: string;
  phonetic_hint?: { syllables: string[]; char_count: number; word_count: number };
  show_hint?: boolean;
  // MATH_INPUT
  answer_format?: string;
  answer_range?: [number, number];
  equation?: string;
  // MATCHING
  pairs?: Array<{ left: string; right: string }>;
  // SORTING
  options?: string[];
  correct_order?: number[];
  // DIAGRAM_LABEL
  image_url?: string;
  labels?: Array<{ id: string; x: number; y: number; answer: string }>;
  // WRITING
  min_words?: number;
  max_words?: number;
  rubric?: string;
  [key: string]: unknown;
}

export interface Tag {
  id: string;
  name: string;
}

// ── Learning ──

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

// ── Gamification ──

export interface LearnerStats {
  id: string;
  learner: string;
  xp: number;
  level: number;
  xp_for_next_level: number;
  progress_to_next_level: number;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  total_correct: number;
  total_incorrect: number;
  total_partial: number;
  total_sessions: number;
  daily_xp_goal: number;
  daily_xp_earned: number;
  daily_xp_date: string | null;
  updated_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  required_xp: number;
  required_streak: number;
  required_correct_count: number;
  sort_order: number;
}

export interface LearnerBadge {
  id: string;
  learner: string;
  badge: Badge;
  awarded_at: string;
}

export interface DailyActivity {
  id: string;
  learner: string;
  date: string;
  xp_earned: number;
  items_completed: number;
  seconds_practiced: number;
}

export interface LeaderboardEntry {
  learner_id: string;
  xp: number;
  level: number;
  streak: number;
  rank: number;
}

export interface GamificationSummary {
  stats: LearnerStats;
  badges: LearnerBadge[];
  week_activities: DailyActivity[];
  daily_xp_goal: number;
}

// ── Teacher ──

export interface LessonCreatePayload {
  title: string;
  description?: string;
  subject: string;
  level: string;
  license_type: LicenseType;
  source_url?: string;
  language_code?: string;
  script?: string;
  body?: string;
  items?: LessonItemPayload[];
  media?: LessonMediaPayload[];
}

export interface LessonItemPayload {
  item_type: ItemType;
  prompt: string;
  hint?: string;
  metadata?: ItemMetadata;
  sort_order?: number;
  points?: number;
}

export interface LessonMediaPayload {
  type: MediaType;
  url?: string;
  caption?: string;
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
