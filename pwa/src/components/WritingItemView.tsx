import {useState, useCallback} from 'react';
import {Item} from '../api/types';
import styles from './WritingItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function WritingItemView({item, onAnswer}: Props) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const minWords = item.metadata.min_words || 5;
  const maxWords = item.metadata.max_words || 100;
  const rubric = item.metadata.rubric || '';
  const hint = item.hint || '';

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isValid = wordCount >= minWords && wordCount <= maxWords;

  const handleSubmit = useCallback(() => {
    if (submitted || !isValid) return;
    setSubmitted(true);
    // Writing is self/teacher-assessed; mark as PARTIAL correctness
    onAnswer(true, {
      response_text: text,
      word_count: wordCount,
      min_words: minWords,
      max_words: maxWords,
    });
  }, [submitted, isValid, text, wordCount, minWords, maxWords, onAnswer]);

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{item.prompt}</p>

      {rubric && (
        <div className={styles.rubric}>
          <span className={styles.rubricLabel}>Rubric:</span>
          <span>{rubric}</span>
        </div>
      )}

      {!submitted && hint && (
        <div className={styles.hint}>
          <span>💡 {hint}</span>
        </div>
      )}

      {!submitted && (
        <>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Write at least ${minWords} words...`}
            rows={6}
          />
          <div className={styles.footer}>
            <span className={`${styles.wordCount} ${!isValid && text ? styles.invalid : ''}`}>
              {wordCount} / {minWords} words min
            </span>
            <button className={styles.submitBtn} onClick={handleSubmit} disabled={!isValid}>
              Submit Response
            </button>
          </div>
        </>
      )}

      {submitted && (
        <div className={styles.responseCard}>
          <span className={styles.responseLabel}>Your response:</span>
          <p className={styles.responseText}>{text}</p>
          <span className={styles.responseWords}>{wordCount} words</span>
        </div>
      )}
    </div>
  );
}
