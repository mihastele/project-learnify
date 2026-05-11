import {useState, useCallback} from 'react';
import {Item} from '../api/types';
import styles from './MathInputItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function MathInputItemView({item, onAnswer}: Props) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const correctAnswer = item.metadata.correct_answer || '';
  const equation = item.metadata.equation || '';
  const hint = item.hint || '';

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    const correctAnsStr = String(correctAnswer);
    const isCorrect = answer.trim() === correctAnsStr.trim();
    setCorrect(isCorrect);
    setTimeout(() => {
      onAnswer(isCorrect, {given_answer: answer, correct_answer: correctAnsStr});
    }, 1500);
  }, [answer, correctAnswer, submitted, onAnswer]);

  return (
    <div className={styles.container}>
      <div className={styles.promptCard}>
        <span className={styles.label}>Solve:</span>
        <p className={styles.prompt}>{item.prompt}</p>
        {equation && (
          <div className={styles.equationBox}>
            <code className={styles.equation}>{equation}</code>
          </div>
        )}
      </div>

      {!submitted && hint && (
        <div className={styles.hintBox}>
          <span className={styles.hintIcon}>💡</span>
          <span>{hint}</span>
        </div>
      )}

      {!submitted && (
        <div className={styles.inputRow}>
          <input
            className={styles.input}
            type="text"
            inputMode="decimal"
            placeholder="Enter your answer..."
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={!answer.trim()}>
            Submit
          </button>
        </div>
      )}

      {submitted && (
        <div className={`${styles.resultCard} ${correct ? styles.correctCard : styles.incorrectCard}`}>
          <span className={styles.resultIcon}>{correct ? '✅' : '❌'}</span>
          <div className={styles.resultContent}>
            <strong>{correct ? 'Correct!' : 'Not quite'}</strong>
            {!correct && (
              <span className={styles.correctAnswer}>
                Answer: <strong>{correctAnswer}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
