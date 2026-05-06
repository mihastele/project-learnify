import {Badge, LearnerBadge} from '../api/types';
import styles from './BadgeWall.module.css';

interface Props {
  badges: Badge[];
  earned: LearnerBadge[];
}

export default function BadgeWall({badges, earned}: Props) {
  const earnedBadgeIds = new Set(earned.map(e => e.badge.id));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Badges</h3>
      <div className={styles.grid}>
        {badges.map(badge => {
          const isEarned = earnedBadgeIds.has(badge.id);
          const earnedBadge = earned.find(e => e.badge.id === badge.id);
          return (
            <div
              key={badge.id}
              className={`${styles.badge} ${isEarned ? styles.earned : styles.locked}`}
              title={badge.description}
            >
              <span className={styles.icon}>{badge.icon}</span>
              <span className={styles.name}>{badge.name}</span>
              {!isEarned && (
                <div className={styles.req}>
                  {badge.required_xp > 0 && <span>{badge.required_xp} XP</span>}
                  {badge.required_streak > 0 && <span>{badge.required_streak}d streak</span>}
                  {badge.required_correct_count > 0 && <span>{badge.required_correct_count} correct</span>}
                </div>
              )}
              {isEarned && earnedBadge && (
                <span className={styles.earnedDate}>
                  {new Date(earnedBadge.awarded_at).toLocaleDateString()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
