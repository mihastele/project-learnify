import {API_BASE} from './config';
import {
  ContentSyncRequest,
  ContentSyncResponse,
  ProgressSyncRequest,
  ProgressSyncResponse,
} from './types';

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {'Content-Type': 'application/json'},
    ...options,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} on ${path}: ${body}`);
  }

  return res.json() as Promise<T>;
}

export async function pullContent(
  params: ContentSyncRequest,
): Promise<ContentSyncResponse> {
  const qs = new URLSearchParams();
  qs.set('learner_id', params.learner_id);
  if (params.last_sync_at) qs.set('last_sync_at', params.last_sync_at);
  if (params.subject) qs.set('subject', params.subject);
  if (params.level) qs.set('level', params.level);
  if (params.language_code) qs.set('language_code', params.language_code);

  return request<ContentSyncResponse>(`/sync/sync/content/?${qs.toString()}`);
}

export async function pushProgress(
  payload: ProgressSyncRequest,
): Promise<ProgressSyncResponse> {
  return request<ProgressSyncResponse>('/sync/sync/progress/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function postAttempt(
  learnerId: string,
  itemId: string,
  result: string,
  responseData: Record<string, unknown>,
  latencyMs: number | null,
): Promise<{id: string}> {
  return request<{id: string}>('/attempts/', {
    method: 'POST',
    body: JSON.stringify({
      learner: learnerId,
      item: itemId,
      result,
      response_data: responseData,
      latency_ms: latencyMs,
    }),
  });
}
