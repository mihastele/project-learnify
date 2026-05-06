import {useState, useCallback, useMemo} from 'react';
import {Item} from '../api/types';
import styles from './MatchingItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function MatchingItemView({item, onAnswer}: Props) {
  const pairs = item.metadata.pairs || [];
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matches, setMatches] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const shuffledRight = useMemo(() => {
    const right = pairs.map((p, i) => ({...p, originalIndex: i}));
    for (let i = right.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [right[i], right[j]] = [right[j], right[i]];
    }
    return right;
  }, [pairs]);

  const allMatched = pairs.length > 0 && Object.keys(matches).length === pairs.length;

  const handleLeftClick = useCallback((index: number) => {
    if (submitted) return;
    if (matches[index] !== undefined) return;
    setSelectedLeft(index);
  }, [submitted, matches]);

  const handleRightClick = useCallback((rightIdx: number, originalIdx: number) => {
    if (submitted) return;
    if (selectedLeft === null) return;
    setMatches(prev => ({...prev, [selectedLeft]: originalIdx}));
    setSelectedLeft(null);
  }, [submitted, selectedLeft]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    let correct = 0;
    const results: Record<string, unknown> = {};
    for (const [leftIdx, rightOrigIdx] of Object.entries(matches)) {
      const isMatch = Number(leftIdx) === rightOrigIdx;
      if (isMatch) correct++;
      results[`pair_${leftIdx}`] = isMatch;
    }
    const allCorrect = correct === pairs.length;
    onAnswer(allCorrect, results);
  }, [submitted, matches, pairs, onAnswer]);

  const getRightStatus = (originalIdx: number) => {
    const matchedBy = Object.entries(matches).find(([, v]) => v === originalIdx);
    if (matchedBy) return {matched: true, leftIdx: Number(matchedBy[0])};
    return {matched: false, leftIdx: -1};
  };

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{item.prompt}</p>

      <div className={styles.grid}>
        <div className={styles.column}>
          <span className={styles.colLabel}>Left</span>
          {pairs.map((pair, i) => {
            const isMatched = matches[i] !== undefined;
            const isSelected = selectedLeft === i;
            let matchClass = '';
            if (submitted) {
              matchClass = matches[i] === i ? styles.correctPair : styles.incorrectPair;
            }
            return (
              <button
                key={i}
                className={`${styles.pairBtn} ${isSelected ? styles.selected : ''} ${isMatched ? styles.matched : ''} ${matchClass}`}
                onClick={() => handleLeftClick(i)}
                disabled={isMatched && submitted}
              >
                {pair.left}
              </button>
            );
          })}
        </div>

        <div className={styles.column}>
          <span className={styles.colLabel}>Right</span>
          {shuffledRight.map((pair, displayIdx) => {
            const status = getRightStatus(pair.originalIndex);
            let matchClass = '';
            if (submitted) {
              const matchedBy = Object.entries(matches).find(([, v]) => v === pair.originalIndex);
              if (matchedBy) {
                matchClass = Number(matchedBy[0]) === pair.originalIndex
                  ? styles.correctPair : styles.incorrectPair;
              }
            }
            return (
              <button
                key={displayIdx}
                className={`${styles.pairBtn} ${status.matched ? styles.matched : ''} ${matchClass}`}
                onClick={() => handleRightClick(displayIdx, pair.originalIndex)}
                disabled={(status.matched && submitted)}
              >
                {pair.right}
              </button>
            );
          })}
        </div>
      </div>

      {selectedLeft !== null && !submitted && (
        <div className={styles.hintBox}>
          Select the matching item on the right
        </div>
      )}

      {!submitted && (
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!allMatched}
        >
          {allMatched ? 'Check Matches' : `Match ${Object.keys(matches).length}/${pairs.length} pairs`}
        </button>
      )}
    </div>
  );
}
