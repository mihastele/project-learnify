import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import ItemRenderer from '../components/ItemRenderer';
import {
  getNextItemsForSession,
} from '../services/scheduleService';
import {computeItemState} from '../services/srs';
import {saveAttempt, upsertItemState} from '../db/database';
import {Item, Attempt, ItemState} from '../api/types';

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
    getNextItemsForSession(learnerId).then(it => {
      setItems(it);
      setPhase(it.length === 0 ? 'complete' : 'practicing');
    });
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

      // Build and save Attempt locally.
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

      // Update local ItemState via client-side SRS mirror.
      const prevState = {
        easeFactor: 2.5,
        intervalDays: 0,
        repetitions: 0,
        nextDue: now,
      };
      // In a full implementation, we'd load the existing ItemState row first,
      // then pass those fields.  For v1 brevity we use defaults — real usage
      // would query `getItemStates(learnerId)` to find the matching row.
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
        incorrect: s.incorrect + (result === 'INCORRECT' ? 1 : 0),
        partial: s.partial + (result === 'PARTIAL' ? 1 : 0),
      }));

      // Advance to next item or finish.
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading items...</Text>
      </View>
    );
  }

  if (phase === 'complete') {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>Session Complete!</Text>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>
            Correct: {stats.correct}
          </Text>
          <Text style={styles.stat}>
            Needed work: {stats.partial + stats.incorrect}
          </Text>
        </View>
        <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
          <Text style={styles.doneBtnText}>Back to Sync</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const current = items[currentIndex];
  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {items.length}
        </Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {width: `${((currentIndex + 1) / items.length) * 100}%`},
            ]}
          />
        </View>
      </View>
      <ItemRenderer item={current} onAnswer={handleAnswer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  loadingText: {marginTop: 12, fontSize: 16, color: '#555'},
  doneTitle: {fontSize: 24, fontWeight: '700', marginBottom: 16},
  statsRow: {flexDirection: 'row', gap: 20, marginBottom: 24},
  stat: {fontSize: 16, color: '#334155'},
  doneBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  doneBtnText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  progressBar: {paddingHorizontal: 16, paddingTop: 12},
  progressText: {fontSize: 13, color: '#64748b', marginBottom: 6},
  barTrack: {
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  barFill: {
    height: 4,
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
});
