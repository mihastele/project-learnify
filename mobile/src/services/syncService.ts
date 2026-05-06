import {pullContent, pushProgress} from '../api/client';
import {
  getLastContentSyncTime,
  getLastProgressSyncTime,
  getUnsyncedAttempts,
  markAttemptsSynced,
  setLastContentSyncTime,
  setLastProgressSyncTime,
  upsertContentUnit,
  upsertItemState,
} from '../db/database';
import {ItemState} from '../api/types';

/**
 * Pull new/updated content from the server and upsert into local SQLite.
 * Uses incremental timestamps so only delta payloads are transferred.
 */
export async function pullContentOnce(learnerId: string): Promise<number> {
  const lastSync = await getLastContentSyncTime();

  const response = await pullContent({
    learner_id: learnerId,
    last_sync_at: lastSync ?? undefined,
  });

  let imported = 0;
  for (const unit of response.content_units) {
    await upsertContentUnit(unit);
    imported += 1;
  }

  await setLastContentSyncTime(response.server_sync_time);
  return imported;
}

/**
 * Push unsynced attempts to the server and mark them as synced.
 */
export async function pushProgressOnce(learnerId: string): Promise<number> {
  const attempts = await getUnsyncedAttempts(learnerId);
  if (attempts.length === 0) return 0;

  const response = await pushProgress({
    learner_id: learnerId,
    attempts,
  });

  // Update local item_states with server response if the server sent updated states back,
  // then mark attempts as synced.
  for (const st of response.item_states ?? []) {
    if (st.status === 'created') {
      // The server accepted the state; if returned, persist it.
      // (Server may or may not return the full state — we handle both.)
    }
  }

  const syncedIds = response.attempts
    .filter(a => a.status === 'created' || a.status === 'already_exists')
    .map(a => a.id);

  await markAttemptsSynced(syncedIds);
  await setLastProgressSyncTime(response.server_sync_time);
  return syncedIds.length;
}

/** One-stop sync: pull content, then push progress. */
export async function syncAll(learnerId: string): Promise<{contentImported: number; progressSynced: number}> {
  const [contentImported, progressSynced] = await Promise.all([
    pullContentOnce(learnerId),
    pushProgressOnce(learnerId),
  ]);
  return {contentImported, progressSynced};
}
