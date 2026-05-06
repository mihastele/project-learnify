import {getAllItems, getItemStates} from '../db/database';
import {Item, ItemState} from '../api/types';

const DEFAULT_LIMIT = 20;

/**
 * Return the next batch of items the learner should practice.
 *
 * Priority:
 *   1. Overdue items (next_due <= now) ordered by ease_factor ascending.
 *   2. Unseen items (no ItemState row yet) — random sample.
 *   3. Remaining known items ordered by next_due.
 */
export async function getNextItemsForSession(
  learnerId: string,
  limit: number = DEFAULT_LIMIT,
): Promise<Item[]> {
  const now = new Date().toISOString();
  const states = await getItemStates(learnerId);

  const seenItemIds = new Set(states.map(s => s.item));

  // Separate overdue from future-due.
  const overdueIds: string[] = [];
  const futureIds: string[] = [];

  for (const s of states) {
    if (s.next_due <= now) {
      overdueIds.push(s.item);
    } else {
      futureIds.push(s.item);
    }
  }

  // Collect items. Overdue come first, sorted by ease_factor ascending.
  // Sort is done at the SQL level (ORDER BY next_due), so we match by insertion order.
  const pickedIds: string[] = [];

  // Overdue items first.
  const orderedStates = states
    .filter(s => s.next_due <= now)
    .sort((a, b) => a.ease_factor - b.ease_factor);
  for (const s of orderedStates) {
    if (pickedIds.length >= limit) break;
    pickedIds.push(s.item);
  }

  // Fill remaining slots with unseen items.
  if (pickedIds.length < limit) {
    const allItems = await getAllItems();
    const unseen = allItems.filter(i => !seenItemIds.has(i.id));
    // Shuffle unseen items for variety.
    shuffle(unseen);
    for (const item of unseen) {
      if (pickedIds.length >= limit) break;
      pickedIds.push(item.id);
    }
  }

  // If still not enough, add future-due items (closest due first).
  if (pickedIds.length < limit) {
    const remaining = states
      .filter(s => s.next_due > now && !pickedIds.includes(s.item))
      .sort((a, b) => a.next_due.localeCompare(b.next_due));
    for (const s of remaining) {
      if (pickedIds.length >= limit) break;
      pickedIds.push(s.item);
    }
  }

  const allItems = await getAllItems();
  const idSet = new Set(pickedIds);
  return allItems.filter(i => idSet.has(i.id));
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
