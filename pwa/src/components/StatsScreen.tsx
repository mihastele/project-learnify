import styles from './StatsScreen.module.css';

interface Props {
  xp: number;
  level: number;
  xpForNextLevel: number;
  progress: number;
  streak: number;
  longestStreak: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSessions: number;
  dailyXpGoal: number;
  dailyXpEarned: number;
  onClose?: () => void;
}

export default function StatsScreen({
  xp, level, xpForNextLevel, progress,
  streak, longestStreak,
  totalCorrect, totalIncorrect, totalSessions,
  dailyXpGoal, dailyXpEarned,
  onClose,
}: Props) {
  const dailyProgress = Math.min((dailyXpEarned / dailyXpGoal) * 100, 100);
  const accuracy = totalCorrect + totalIncorrect > 0
    ? Math.round((totalCorrect / (totalCorrect + totalIncorrect)) * 100)
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Your Progress</h2>
        {onClose && <button className={styles.closeBtn} onClick={onClose}>✕</button>}
      </div>

      {/* Level & XP */}
      <div className={styles.levelCard}>
        <div className={styles.levelCircle}>
          <span className={styles.levelNum}>{level}</span>
        </div>
        <div className={styles.levelInfo}>
          <span className={styles.levelLabel}>Level {level}</span>
          <div className={styles.xpTrack}>
            <div className={styles.xpFill} style={{width: `${Math.min(progress * 100, 100)}%`}} />
          </div>
          <span className={styles.xpText}>{xp} / {xpForNextLevel} XP</span>
        </div>
      </div>

      {/* Daily Goal */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Daily Goal</h3>
        <div className={styles.goalCard}>
          <span className={styles.goalIcon}>{dailyProgress >= 100 ? '🔥' : '🎯'}</span>
          <div className={styles.goalInfo}>
            <div className={styles.goalTrack}>
              <div className={styles.goalFill} style={{width: `${dailyProgress}%`}} />
            </div>
            <span className={styles.goalText}>{dailyXpEarned}/{dailyXpGoal} XP today</span>
          </div>
        </div>
      </div>

      {/* Streaks */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Streaks</h3>
        <div className={styles.streakRow}>
          <div className={styles.streakCard}>
            <span className={styles.streakIcon}>🔥</span>
            <span className={styles.streakNum}>{streak}</span>
            <span className={styles.streakLabel}>Current</span>
          </div>
          <div className={styles.streakCard}>
            <span className={styles.streakIcon}>🏆</span>
            <span className={styles.streakNum}>{longestStreak}</span>
            <span className={styles.streakLabel}>Best</span>
          </div>
          <div className={styles.streakCard}>
            <span className={styles.streakIcon}>🎯</span>
            <span className={styles.streakNum}>{accuracy}%</span>
            <span className={styles.streakLabel}>Accuracy</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>All-Time</h3>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{totalCorrect}</span>
            <span className={styles.statLabel}>Correct</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{totalIncorrect}</span>
            <span className={styles.statLabel}>Incorrect</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{totalSessions}</span>
            <span className={styles.statLabel}>Sessions</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{xp}</span>
            <span className={styles.statLabel}>Total XP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
