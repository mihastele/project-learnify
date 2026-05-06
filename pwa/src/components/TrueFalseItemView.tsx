import {useState, useCallback} from 'react';
import {Item} from '../api/types';
import styles from './TrueFalseItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function TrueFalseItemView({item, onAnswer}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const correctAnswer: boolean = (item.metadata as Record<string, unknown>).correct_answer !== false;

  const handlePress = useCallback((choice: boolean) => {
    if (submitted) return;
    setSubmitted(true);
    const correct = choice === correctAnswer;
    setTimeout(() => onAnswer(correct, {choice}), 400);
  }, [submitted, correctAnswer, onAnswer]);

  const btnClassName = (highlightAs: boolean): string => {
    if (!submitted) return styles.btn;
    if (highlightAs === correctAnswer) return `${styles.btn} ${styles.btnCorrect}`;
    return `${styles.btn} ${styles.btnIncorrect}`;
  };

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{item.prompt}</p>
      <div className={styles.row}>
        <button
          className={btnClassName(true)}
          onClick={() => handlePress(true)}
          disabled={submitted}
        >
          True
        </button>
        <button
          className={btnClassName(false)}
          onClick={() => handlePress(false)}
          disabled={submitted}
        >
          False
        </button>
      </div>
    </div>
  );
}
