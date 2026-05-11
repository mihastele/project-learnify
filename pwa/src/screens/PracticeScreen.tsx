import {useEffect, useState, useCallback} from 'react';
import ItemRenderer from '../components/ItemRenderer';
import {getNextItemsForSession} from '../services/scheduleService';
import {computeItemState} from '../services/srs';
import {saveAttempt, upsertItemState, ensureLearner} from '../db/database';
import {Item, Attempt, ItemState, LearnerStats} from '../api/types';
import {recordPractice} from '../api/client';
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
  lessonId?: string;
  onDone: (sessionStats: {correct: number; incorrect: number; partial: number; xpEarned: number}) => void;
  onCancel: () => void;
}

type Phase = 'loading' | 'practicing' | 'complete';

interface SessionStats {
  correct: number;
  incorrect: number;
  partial: number;
  xpEarned: number;
}

export default function PracticeScreen({learnerId, lessonId, onDone, onCancel}: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [items, setItems] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stats, setStats] = useState<SessionStats>({correct: 0, incorrect: 0, partial: 0, xpEarned: 0});
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    ensureLearner(learnerId).then(() =>
      getNextItemsForSession(learnerId, lessonId).then(it => {
        setItems(it);
        setPhase(it.length === 0 ? 'complete' : 'practicing');
      }),
    );
  }, [learnerId, lessonId]);

  const handleAnswer = useCallback(
    async (correct: boolean, response: Record<string, unknown>) => {
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

      const xpGain = item.points || (correct ? 10 : 5);

      setStats(s => ({
        correct: s.correct + (result === 'CORRECT' ? 1 : 0),
        incorrect: s.incorrect + ((result as string) === 'INCORRECT' ? 1 : 0),
        partial: s.partial + (result === 'PARTIAL' ? 1 : 0),
        xpEarned: s.xpEarned + xpGain,
      }));

      // Sync gamification in background
      try {
        await recordPractice(learnerId, result, xpGain, 1, Math.floor(latencyMs / 1000));
      } catch {
        // offline, will sync later
      }

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
        <div className="spinner" />
        <span className={styles.loadingText}>Loading items...</span>
        <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className={styles.center}>
        <div className={styles.doneCard}>
          <span className={styles.doneIcon}>🎉</span>
          <h2 className={styles.doneTitle}>Session Complete!</h2>
          <div className={styles.doneXp}>+{stats.xpEarned} XP</div>
          <div className={styles.statsRow}>
            <div className={styles.statBlock}>
              <span className={styles.statNum}>{stats.correct}</span>
              <span className={styles.statLabel}>Correct</span>
            </div>
            <div className={styles.statBlock}>
              <span className={styles.statNum}>{stats.partial + stats.incorrect}</span>
              <span className={styles.statLabel}>Needs Work</span>
            </div>
          </div>
          <button className={styles.doneBtn} onClick={() => onDone(stats)}>
            Continue Learning
          </button>
        </div>
      </div>
    );
  }

  const current = items[currentIndex];
  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <button className={styles.cancelBtn} onClick={onCancel}>✕</button>
        <div className={styles.progressBar}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{width: `${((currentIndex + 1) / items.length) * 100}%`}}
            />
          </div>
          <span className={styles.progressText}>
            {currentIndex + 1} / {items.length}
          </span>
        </div>
      </div>
      <div className={styles.itemContainer}>
        <ItemRenderer key={current.id} item={current} onAnswer={handleAnswer} />
      </div>
    </div>
  );
}
