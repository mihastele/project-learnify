import {useState, useCallback} from 'react';
import {Item} from '../api/types';
import styles from './ListenAnswerItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function ListenAnswerItemView({item, onAnswer}: Props) {
  const [value, setValue] = useState('');
  const [playing, setPlaying] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    // In a full implementation, play the audio from item.metadata.audio_url.
    setTimeout(() => setPlaying(false), 3000);
  }, []);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    const {correct_answer = ''} = item.metadata;
    const correct =
      value.trim().toLowerCase() === String(correct_answer).trim().toLowerCase();
    setTimeout(() => onAnswer(correct, {answer: value.trim()}), 400);
  }, [value, submitted, item.metadata, onAnswer]);

  return (
    <div className={styles.container}>
      <p className={styles.prompt}>{item.prompt}</p>
      <button
        className={`${styles.playBtn} ${playing ? styles.playBtnActive : ''}`}
        onClick={handlePlay}
        disabled={playing}
      >
        {playing ? 'Playing...' : 'Play Audio \u25B6'}
      </button>
      <input
        className={`${styles.input} ${submitted ? styles.inputDisabled : ''}`}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Type what you heard..."
        readOnly={submitted}
        autoCapitalize="off"
      />
      {submitted && (
        <span className={styles.reveal}>
          Correct answer: {item.metadata.correct_answer || '-'}
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
