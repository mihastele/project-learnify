import {useEffect, useState, useCallback} from 'react';
import {ContentUnit, LeaderboardEntry, GamificationSummary} from '../api/types';
import {
  fetchContentUnits, fetchLeaderboard, fetchGamificationSummary,
} from '../api/client';
import styles from './ClassroomScreen.module.css';

interface Props {
  learnerId: string;
  onStartLesson: (unit: ContentUnit) => void;
}

export default function ClassroomScreen({learnerId, onStartLesson}: Props) {
  const [units, setUnits] = useState<ContentUnit[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [unitsData, leaderData, gameData] = await Promise.all([
        fetchContentUnits(),
        fetchLeaderboard(10),
        fetchGamificationSummary(learnerId).catch(() => null),
      ]);
      setUnits(unitsData || []);
      setLeaderboard(leaderData);
      setGamification(gameData);
    } catch {
      // offline fallback
    }
    setLoading(false);
  }, [learnerId]);

  useEffect(() => { load(); }, [load]);

  const subjects = [...new Set(units.map(u => u.subject))];
  const filtered = filter ? units.filter(u => u.subject === filter) : units;

  const stats = gamification?.stats;

  return (
    <div className={styles.container}>
      {/* Hero card with stats */}
      {stats && (
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <div className={styles.levelBadge}>
              <span className={styles.levelNum}>{stats.level}</span>
            </div>
            <div className={styles.heroInfo}>
              <span className={styles.heroTitle}>Level {stats.level}</span>
              <div className={styles.xpWrap}>
                <div className={styles.xpTrack}>
                  <div className={styles.xpFill} style={{width: `${Math.min(stats.progress_to_next_level * 100, 100)}%`}} />
                </div>
                <span className={styles.xpText}>{stats.xp} XP</span>
              </div>
            </div>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStat}>
              <span>🔥 {stats.current_streak}</span>
              <span className={styles.heroStatLabel}>Streak</span>
            </div>
            <div className={styles.heroStat}>
              <span>✅ {stats.total_correct}</span>
              <span className={styles.heroStatLabel}>Correct</span>
            </div>
            <div className={styles.heroStat}>
              <span>🎯 {stats.daily_xp_earned}/{stats.daily_xp_goal}</span>
              <span className={styles.heroStatLabel}>Daily XP</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard peek */}
      {leaderboard.length > 0 && (
        <div className={styles.leaderMini}>
          <span className={styles.leaderTitle}>🏆 Top Learners</span>
          <div className={styles.leaderList}>
            {leaderboard.slice(0, 5).map(e => (
              <div key={e.learner_id} className={styles.leaderRow}>
                <span className={styles.leaderRank}>#{e.rank}</span>
                <span className={styles.leaderXp}>{e.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject filter */}
      <div className={styles.filterRow}>
        <span
          className={`${styles.filterTag} ${filter === '' ? styles.filterActive : ''}`}
          onClick={() => setFilter('')}
        >
          All
        </span>
        {subjects.map(s => (
          <span
            key={s}
            className={`${styles.filterTag} ${filter === s ? styles.filterActive : ''}`}
            onClick={() => setFilter(s)}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Lessons grid */}
      {loading ? (
        <div className={styles.loading}>
          <div className="spinner" />
          <span>Loading lessons...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <span>No lessons found. Use the Teacher tab to create lessons!</span>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(unit => (
            <div
              key={unit.id}
              className={styles.lessonCard}
              onClick={() => onStartLesson(unit)}
            >
              <div className={styles.lessonSubject}>
                {unit.subject === 'LANGUAGE' ? '🌍' :
                 unit.subject === 'MATH' ? '🔢' :
                 unit.subject === 'SCIENCE' ? '🔬' :
                 unit.subject === 'HISTORY' ? '📜' :
                 unit.subject === 'GEOGRAPHY' ? '🌎' :
                 unit.subject === 'ART' ? '🎨' :
                 unit.subject === 'MUSIC' ? '🎵' :
                 unit.subject === 'CODING' ? '💻' : '📚'}
              </div>
              <h3 className={styles.lessonTitle}>{unit.title}</h3>
              <span className={styles.lessonMeta}>
                {unit.level} · {unit.items?.length || 0} items
              </span>
              {unit.description && (
                <p className={styles.lessonDesc}>{unit.description}</p>
              )}
              <button className={styles.startBtn}>Start Lesson</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
