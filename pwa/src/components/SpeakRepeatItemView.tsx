import {useState, useCallback} from 'react';
import {Item} from '../api/types';
import styles from './SpeakRepeatItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function SpeakRepeatItemView({item, onAnswer}: Props) {
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const handleRecord = useCallback(() => {
    setRecording(true);
    // In a full implementation, use the MediaRecorder API to record audio.
    setTimeout(() => {
      setRecording(false);
      setRecorded(true);
    }, 2000);
  }, []);

  const handleSelfAssess = useCallback((correct: boolean) => {
    onAnswer(correct, {self_assessment: correct ? 'CORRECT' : 'INCORRECT'});
  }, [onAnswer]);

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{item.prompt}</p>
      <button
        className={`${styles.recordBtn} ${recording ? styles.recordBtnActive : ''}`}
        onClick={handleRecord}
        disabled={recording}
      >
        {recording
          ? 'Recording...'
          : recorded
            ? 'Record Again \u23FA'
            : 'Start Recording \u23FA'}
      </button>
      {recorded && (
        <div className={styles.assessment}>
          <span className={styles.assessLabel}>How did you do?</span>
          <div className={styles.row}>
            <button
              className={`${styles.assessBtn} ${styles.assessCorrect}`}
              onClick={() => handleSelfAssess(true)}
            >
              Correct
            </button>
            <button
              className={`${styles.assessBtn} ${styles.assessIncorrect}`}
              onClick={() => handleSelfAssess(false)}
            >
              Needs Work
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
