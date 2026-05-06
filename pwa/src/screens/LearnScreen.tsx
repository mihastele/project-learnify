import {ContentUnit} from '../api/types';
import styles from './LearnScreen.module.css';

interface Props {
  lesson: ContentUnit;
  onStartPractice: () => void;
  onBack: () => void;
}

export default function LearnScreen({lesson, onStartPractice, onBack}: Props) {
  const variant = lesson.variants?.[0];
  const bodyText = variant?.body || '';
  const paragraphs = bodyText.split('\n').filter(Boolean);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <span className={styles.subjectTag}>
          {lesson.subject === 'LANGUAGE' ? '🌍' :
           lesson.subject === 'MATH' ? '🔢' :
           lesson.subject === 'SCIENCE' ? '🔬' :
           lesson.subject === 'HISTORY' ? '📜' :
           lesson.subject === 'GEOGRAPHY' ? '🌎' :
           lesson.subject === 'ART' ? '🎨' :
           lesson.subject === 'MUSIC' ? '🎵' :
           lesson.subject === 'CODING' ? '💻' : '📚'}
          {' '}{lesson.subject}
        </span>
      </div>

      <h1 className={styles.title}>{lesson.title}</h1>

      <div className={styles.meta}>
        <span className={styles.metaItem}>Level: {lesson.level}</span>
        <span className={styles.metaItem}>{lesson.items?.length || 0} exercises</span>
        {variant && <span className={styles.metaItem}>{variant.language_code}</span>}
      </div>

      {lesson.description && (
        <p className={styles.description}>{lesson.description}</p>
      )}

      <div className={styles.contentCard}>
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p key={i} className={styles.paragraph}>{p}</p>
          ))
        ) : (
          <p className={styles.emptyContent}>No lesson content available.</p>
        )}
      </div>

      {/* Media */}
      {lesson.media && lesson.media.length > 0 && (
        <div className={styles.mediaSection}>
          <h3 className={styles.sectionTitle}>Media</h3>
          {lesson.media.map(m => (
            <div key={m.id} className={styles.mediaItem}>
              {m.type === 'AUDIO' && m.url && (
                <button className={styles.playBtn} onClick={() => new Audio(m.url!).play()}>
                  ▶ Play Audio
                </button>
              )}
              {m.type === 'IMAGE' && m.url && (
                <img src={m.url} alt={m.caption || undefined} className={styles.mediaImage} />
              )}
              {m.type === 'VIDEO' && m.url && (
                <a href={m.url} target="_blank" rel="noreferrer" className={styles.videoLink}>
                  ▶ Watch Video
                </a>
              )}
              {m.caption && <span className={styles.mediaCaption}>{m.caption}</span>}
            </div>
          ))}
        </div>
      )}

      <button className={styles.practiceBtn} onClick={onStartPractice}>
        Start Practice ({lesson.items?.length || 0} items)
      </button>
    </div>
  );
}
