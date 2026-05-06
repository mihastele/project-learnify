import {LeaderboardEntry} from '../api/types';
import styles from './Leaderboard.module.css';

interface Props {
  entries: LeaderboardEntry[];
  currentLearnerId?: string;
}

export default function Leaderboard({entries, currentLearnerId}: Props) {
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Leaderboard</h3>

      {top3.length > 0 && (
        <div className={styles.podium}>
          {top3.map((entry, i) => (
            <div
              key={entry.learner_id}
              className={`${styles.podiumItem} ${entry.learner_id === currentLearnerId ? styles.isYou : ''}`}
            >
              <span className={styles.podiumRank}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </span>
              <span className={styles.podiumXp}>{entry.xp} XP</span>
              <span className={styles.podiumLevel}>Lv.{entry.level}</span>
            </div>
          ))}
        </div>
      )}

      {rest.length > 0 && (
        <div className={styles.list}>
          {rest.map(entry => (
            <div
              key={entry.learner_id}
              className={`${styles.listItem} ${entry.learner_id === currentLearnerId ? styles.isYou : ''}`}
            >
              <span className={styles.listRank}>#{entry.rank}</span>
              <span className={styles.listId}>{entry.learner_id.slice(0, 8)}</span>
              <span className={styles.listXp}>{entry.xp} XP</span>
              <span className={styles.listLevel}>Lv.{entry.level}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
