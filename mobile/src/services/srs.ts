/**
 * Client-side mirror of the backend SRS algorithm (learning/srs.py).
 *
 * Used so the app can update local item_states immediately after an attempt
 * without waiting for a server round-trip.  Must stay in sync with the backend
 * constants and logic.
 */

const MIN_EASE_FACTOR = 1.3;
const EASE_CORRECT_BONUS = 0.1;
const EASE_INCORRECT_PENALTY = 0.2;
const INTERVAL_FIRST_CORRECT_DAYS = 1;
const INTERVAL_SECOND_CORRECT_DAYS = 6;

interface SrsInput {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextDue: Date;
}

interface SrsOutput {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextDue: Date;
}

export function computeItemState(
  prev: SrsInput,
  result: 'CORRECT' | 'INCORRECT' | 'PARTIAL',
  now: Date = new Date(),
): SrsOutput {
  let {easeFactor, intervalDays, repetitions} = prev;

  if (result === 'CORRECT') {
    easeFactor = Math.max(easeFactor + EASE_CORRECT_BONUS, MIN_EASE_FACTOR);
    repetitions += 1;
    if (repetitions === 1) {
      intervalDays = INTERVAL_FIRST_CORRECT_DAYS;
    } else if (repetitions === 2) {
      intervalDays = INTERVAL_SECOND_CORRECT_DAYS;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  } else {
    easeFactor = Math.max(easeFactor - EASE_INCORRECT_PENALTY, MIN_EASE_FACTOR);
    repetitions = 0;
    intervalDays = INTERVAL_FIRST_CORRECT_DAYS;
  }

  const nextDue = new Date(now.getTime() + intervalDays * 86_400_000);

  return {easeFactor, intervalDays, repetitions, nextDue};
}
