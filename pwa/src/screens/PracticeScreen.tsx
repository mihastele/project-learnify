import {useEffect, useState, useCallback} from 'react';

import ItemRenderer from '../components/ItemRenderer';
import {
  getNextItemsForSession,
} from '../services/scheduleService';
import {computeItemState} from '../services/srs';
import {saveAttempt, upsertItemState, ensureLearner} from '../db/database';
import {Item, Attempt, ItemState} from '../api/types';
import styles from './PracticeScreen.module.css';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface Props {
  learnerId: string;
  onDone: () => void;
}

type Phase = 'loading' | 'practicing' | 'complete';

interface SessionStats {
  correct: number;
  incorrect: number;
  partial: number;
}

export default function PracticeScreen({learnerId, onDone}: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState<SessionStats>({correct: 0, incorrect: 0, partial: 0});
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    ensureLearner(learnerId).then(() =>
      getNextItemsForSession(learnerId).then(it => {
        setItems(it);
        setPhase(it.length === 0 ? 'complete' : 'practicing');
      }),
    );
  }, [learnerId]);

  const handleAnswer = useCallback(
    (correct: boolean, response: Record<string, unknown>) => {
      if (currentIndex >= items.length) return;

      const item = items[currentIndex];
      const now = new Date();
      const latencyMs = Date.now() - startTime;

      const result: 'CORRECT' | 'INCORRECT' | 'PARTIAL' = correct
        ? 'CORRECT'
        : 'PARTIAL';

      const attempt: Attempt = {
        id: uuid(),
        learner: learnerId,
        item: item.id,
        timestamp: now.toISOString(),
        result,
        response_data: response,
        latency_ms: latencyMs,
        synced: false,
      };
      saveAttempt(attempt);

      const prevState = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextDue: now,
      };
      const updated = computeItemState(prevState, result, now);
      const newState: ItemState = {
        id: uuid(),
        learner: learnerId,
        item: item.id,
        ease_factor: updated.easeFactor,
        interval_days: updated.intervalDays,
        repetitions: updated.repetitions,
        next_due: updated.nextDue.toISOString(),
      };
      upsertItemState(newState);

      setStats(s => ({
        correct: s.correct + (result === 'CORRECT' ? 1 : 0),
        incorrect: s.incorrect + ((result as string) === 'INCORRECT' ? 1 : 0),
        partial: s.partial + (result === 'PARTIAL' ? 1 : 0),
      }));

      const next = currentIndex + 1;
      if (next >= items.length) {
        setPhase('complete');
      } else {
        setCurrentIndex(next);
      }
    },
    [currentIndex, items, learnerId, startTime],
  );

  if (phase === 'loading') {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
        <span className={styles.loadingText}>Loading items...</span>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className={styles.center}>
        <h2 className={styles.doneTitle}>Session Complete!</h2>
        <div className={styles.statsRow}>
          <span className={styles.stat}>
            Correct: {stats.correct}
          </span>
          <span className={styles.stat}>
            Needed work: {stats.partial + stats.incorrect}
          </span>
        </div>
        <button className={styles.doneBtn} onClick={onDone}>
          Back to Sync
        </button>
      </div>
    );
  }

  const current = items[currentIndex];
  return (
    <div className={styles.container}>
      <div className={styles.progressBar}>
        <span className={styles.progressText}>
          {currentIndex + 1} / {items.length}
        </span>
        <div className={styles.barTrack}>
          <div
            className={styles.barFill}
            style={{width: `${((currentIndex + 1) / items.length) * 100}%`}}
          />
        </div>
      </div>
      <ItemRenderer item={current} onAnswer={handleAnswer} />
    </div>
  );
}
