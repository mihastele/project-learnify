import {useState, useCallback} from 'react';
import {Item} from '../api/types';
import styles from './DiagramLabelItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

interface Label {
  id: string;
  x: number;
  y: number;
  answer: string;
}

export default function DiagramLabelItemView({item, onAnswer}: Props) {
  const labels: Label[] = item.metadata.labels || [];
  const imageUrl = item.metadata.image_url || '';
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = useCallback((labelId: string, value: string) => {
    setAnswers(prev => ({...prev, [labelId]: value}));
  }, []);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    let correct = 0;
    const results: Record<string, unknown> = {};
    for (const label of labels) {
      const given = (answers[label.id] || '').trim().toLowerCase();
      const expected = label.answer.trim().toLowerCase();
      const isMatch = given === expected;
      if (isMatch) correct++;
      results[label.id] = {given: answers[label.id] || '', expected: label.answer, correct: isMatch};
    }
    onAnswer(correct === labels.length, results);
  }, [submitted, answers, labels, onAnswer]);

  const allFilled = labels.every(l => (answers[l.id] || '').trim());

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{item.prompt}</p>

      {imageUrl && (
        <div className={styles.imageContainer}>
          <img src={imageUrl} alt="Diagram" className={styles.image} />
          {labels.map((label, i) => (
            <div
              key={label.id}
              className={styles.pin}
              style={{left: `${label.x}%`, top: `${label.y}%`}}
            >
              <span className={styles.pinNumber}>{i + 1}</span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.inputsGrid}>
        {labels.map((label, i) => {
          const given = answers[label.id] || '';
          const isCorrect = submitted && given.trim().toLowerCase() === label.answer.trim().toLowerCase();
          let cls = styles.inputGroup;
          if (submitted) cls += isCorrect ? ` ${styles.correct}` : ` ${styles.incorrect}`;
          return (
            <div key={label.id} className={cls}>
              <span className={styles.labelNum}>{i + 1}.</span>
              <input
                className={styles.input}
                placeholder="Label..."
                value={given}
                onChange={e => handleChange(label.id, e.target.value)}
                disabled={submitted}
              />
              {submitted && !isCorrect && (
                <span className={styles.correctLabel}>{label.answer}</span>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <button className={styles.submitBtn} onClick={handleSubmit} disabled={!allFilled}>
          {allFilled ? 'Check Labels' : 'Fill all labels'}
        </button>
      )}
    </div>
  );
}
