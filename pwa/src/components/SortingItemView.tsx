import {useState, useCallback} from 'react';
import {Item} from '../api/types';
import styles from './SortingItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function SortingItemView({item, onAnswer}: Props) {
  const options: string[] = item.metadata.options || [];
  const correctOrder: number[] = item.metadata.correct_order || options.map((_, i) => i);
  const [items, setItems] = useState(() => {
    const shuffled = [...options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });
  const [submitted, setSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const moveItem = useCallback((fromIdx: number, toIdx: number) => {
    if (submitted) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, [submitted]);

  const moveUp = (idx: number) => { if (idx > 0) moveItem(idx, idx - 1); };
  const moveDown = (idx: number) => { if (idx < items.length - 1) moveItem(idx, idx + 1); };

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    let allCorrect = true;
    const results: Record<string, unknown> = {};
    for (let i = 0; i < items.length; i++) {
      const correct = items[i] === options[correctOrder[i]];
      if (!correct) allCorrect = false;
      results[`pos_${i}`] = {given: items[i], expected: options[correctOrder[i]], correct};
    }
    onAnswer(allCorrect, results);
  }, [submitted, items, options, correctOrder, onAnswer]);

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{item.prompt}</p>

      <div className={styles.list}>
        {items.map((text, idx) => {
          const isCorrect = submitted && text === options[correctOrder[idx]];
          let cls = styles.item;
          if (submitted) {
            cls += isCorrect ? ` ${styles.correctItem}` : ` ${styles.incorrectItem}`;
          }
          return (
            <div key={idx} className={cls}>
              <span className={styles.index}>{idx + 1}</span>
              <span className={styles.itemText}>{text}</span>
              {!submitted && (
                <div className={styles.arrows}>
                  <button className={styles.arrowBtn} onClick={() => moveUp(idx)} disabled={idx === 0}>▲</button>
                  <button className={styles.arrowBtn} onClick={() => moveDown(idx)} disabled={idx === items.length - 1}>▼</button>
                </div>
              )}
              {submitted && (
                <span className={styles.status}>{isCorrect ? '✅' : '❌'}</span>
              )}
            </div>
          );
        })}
      </div>

      {!submitted && (
        <button className={styles.submitBtn} onClick={handleSubmit}>
          Check Order
        </button>
      )}
    </div>
  );
}
