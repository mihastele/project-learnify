import {useState, useCallback} from 'react';
import {Item} from '../api/types';
import styles from './ClozeItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function ClozeItemView({item, onAnswer}: Props) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    const {correct_answer = '', blank_word = ''} = item.metadata;
    const expected = correct_answer || blank_word || '';
    const correct =
      value.trim().toLowerCase() === expected.trim().toLowerCase();
    setTimeout(() => onAnswer(correct, {answer: value.trim()}), 400);
  }, [value, submitted, item.metadata, onAnswer]);

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{item.prompt}</p>
      <input
        className={`${styles.input} ${submitted ? styles.inputDisabled : ''}`}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Type your answer..."
        readOnly={submitted}
        autoCapitalize="off"
      />
      {submitted && (
        <span className={styles.reveal}>
          Correct answer: {item.metadata.correct_answer || item.metadata.blank_word}
        </span>
      )}
      <button
        className={`${styles.submitBtn} ${(!value.trim() || submitted) ? styles.submitBtnDisabled : ''}`}
        onClick={handleSubmit}
        disabled={!value.trim() || submitted}
      >
        Submit
      </button>
    </div>
  );
}
