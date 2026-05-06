import {useState, useCallback} from 'react';
import {Item} from '../api/types';
import styles from './MCQItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function MCQItemView({item, onAnswer}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const {choices = [], correct_index = 0} = item.metadata;

  const handleChoose = useCallback((index: number) => {
    if (submitted) return;
    setSelected(index);
  }, [submitted]);

  const handleSubmit = useCallback(() => {
    if (selected === null || submitted) return;
    setSubmitted(true);
    const correct = selected === correct_index;
    setTimeout(() => onAnswer(correct, {selected_index: selected}), 400);
  }, [selected, submitted, correct_index, onAnswer]);

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{item.prompt}</p>
      <div className={styles.choices}>
        {choices.map((choice, index) => {
          const isSelected = selected === index;
          const isCorrect = index === correct_index;
          let className = styles.choice;
          if (submitted) {
            if (isCorrect) className += ` ${styles.choiceCorrect}`;
            else if (isSelected && !isCorrect) className += ` ${styles.choiceIncorrect}`;
          } else if (isSelected) {
            className += ` ${styles.choiceSelected}`;
          }
          return (
            <button
              key={index}
              className={className}
              onClick={() => handleChoose(index)}
              disabled={submitted}
            >
              {choice}
            </button>
          );
        })}
      </div>
      <button
        className={`${styles.submitBtn} ${selected === null ? styles.submitBtnDisabled : ''}`}
        onClick={handleSubmit}
        disabled={selected === null || submitted}
      >
        Submit
      </button>
    </div>
  );
}
