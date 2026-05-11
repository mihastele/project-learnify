import {API_BASE} from './config';
import {
  Badge,
  ContentSyncRequest,
  ContentSyncResponse,
  ContentUnit,
  GamificationSummary,
  Item,
  LeaderboardEntry,
  LearnerStats,
  LessonCreatePayload,
  ProgressSyncRequest,
  ProgressSyncResponse,
} from './types';

let currentToken: string | null = null;
export function setApiToken(token: string | null) {
  currentToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {'Content-Type': 'application/json'};
  if (currentToken) {
    headers['Authorization'] = `Token ${currentToken}`;
  }
  const res = await fetch(url, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} on ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Sync ──

export async function pullContent(params: ContentSyncRequest): Promise<ContentSyncResponse> {
  const qs = new URLSearchParams();
  qs.set('learner_id', params.learner_id);
  if (params.last_sync_at) qs.set('last_sync_at', params.last_sync_at);
  if (params.subject) qs.set('subject', params.subject);
  if (params.level) qs.set('level', params.level);
  if (params.language_code) qs.set('language_code', params.language_code);
  return request<ContentSyncResponse>(`/sync/sync/content/?${qs.toString()}`);
}

export async function pushProgress(payload: ProgressSyncRequest): Promise<ProgressSyncResponse> {
  return request<ProgressSyncResponse>('/sync/sync/progress/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Content ──

export async function fetchContentUnits(subject?: string, level?: string): Promise<ContentUnit[]> {
  const qs = new URLSearchParams();
  if (subject) qs.set('subject', subject);
  if (level) qs.set('level', level);
  const data = await request<{results: ContentUnit[]}>(`/content_units/?${qs.toString()}`);
  return data.results;
}

export async function fetchContentUnit(id: string): Promise<ContentUnit> {
  return request<ContentUnit>(`/content_units/${id}/`);
}

export async function fetchItems(unitId: string): Promise<Item[]> {
  return request<Item[]>(`/content_units/${unitId}/items/`);
}

export async function getNextItems(learnerId: string, limit = 20, subject?: string, itemType?: string) {
  const qs = new URLSearchParams({limit: String(limit)});
  if (subject) qs.set('subject', subject);
  if (itemType) qs.set('item_type', itemType);
  return request<Item[]>(`/learners/${learnerId}/next_items/?${qs.toString()}`);
}

// ── Learning ──

export async function postAttempt(
  learnerId: string, itemId: string, result: string,
  responseData: Record<string, unknown>, latencyMs: number | null,
): Promise<{id: string}> {
  return request<{id: string}>('/attempts/', {
    method: 'POST',
    body: JSON.stringify({
      learner: learnerId, item: itemId, result,
      response_data: responseData, latency_ms: latencyMs,
    }),
  });
}

// ── Gamification ──

export async function fetchGamificationSummary(learnerId: string): Promise<GamificationSummary> {
  return request<GamificationSummary>(`/gamification/stats/?learner_id=${learnerId}`);
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  return request<LeaderboardEntry[]>(`/gamification/leaderboard/?limit=${limit}`);
}

export async function fetchStats(learnerId: string): Promise<LearnerStats> {
  return request<LearnerStats>(`/stats/${learnerId}/`);
}

export async function fetchBadges(learnerId: string) {
  return request<Badge[]>('/badges/');
}

export async function fetchLearnerBadges(learnerId: string) {
  return request(`/learners/${learnerId}/badges/`);
}

export async function recordPractice(
  learnerId: string, result: string, xpEarned: number,
  itemsDone: number, secondsPracticed: number,
): Promise<LearnerStats> {
  return request<LearnerStats>('/gamification/record_practice/', {
    method: 'POST',
    body: JSON.stringify({
      learner_id: learnerId, result,
      xp_earned: xpEarned, items_completed: itemsDone,
      seconds_practiced: secondsPracticed,
    }),
  });
}

export async function setDailyGoal(learnerId: string, goal: number): Promise<LearnerStats> {
  return request<LearnerStats>('/gamification/set_daily_goal/', {
    method: 'POST',
    body: JSON.stringify({learner_id: learnerId, daily_xp_goal: goal}),
  });
}

// ── Teacher ──

export async function createLesson(payload: LessonCreatePayload): Promise<ContentUnit> {
  return request<ContentUnit>('/teacher/teacher/create_lesson/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMyLessons(): Promise<ContentUnit[]> {
  return request<ContentUnit[]>('/teacher/teacher/my_lessons/');
}

export async function fetchTeacherLesson(id: string): Promise<ContentUnit> {
  return request<ContentUnit>(`/teacher/teacher/lesson/?id=${id}`);
}

export async function updateLesson(id: string, payload: Partial<LessonCreatePayload>): Promise<ContentUnit> {
  return request<ContentUnit>(`/teacher/teacher/lesson/?id=${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteLesson(id: string): Promise<void> {
  await request(`/teacher/teacher/lesson/?id=${id}`, {method: 'DELETE'});
}
