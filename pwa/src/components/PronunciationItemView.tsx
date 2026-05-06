import {useState, useCallback, useRef} from 'react';
import {Item} from '../api/types';
import styles from './PronunciationItemView.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

export default function PronunciationItemView({item, onAnswer}: Props) {
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [userText, setUserText] = useState('');
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null);
  const startTimeRef = useRef(Date.now());

  const targetText = item.metadata.target_text || item.prompt;
  const hintText = item.hint || item.metadata.phonetic_hint
    ? `Syllables: ${item.metadata.phonetic_hint?.syllables?.join(' · ') || ''}`
    : 'Tap to reveal hint';
  const audioUrl = item.metadata.audio_url;

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    const userLower = userText.trim().toLowerCase();
    const targetLower = targetText.trim().toLowerCase();
    const isCorrect = userLower === targetLower;
    setResult(isCorrect ? 'correct' : 'incorrect');
    onAnswer(isCorrect, {
      spoken_text: userText,
      target_text: targetText,
      used_hint: showHint,
    });
  }, [userText, targetText, submitted, showHint, onAnswer]);

  const handleRecord = useCallback(() => {
    setRecording(true);
    setTimeout(() => setRecording(false), 2000);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.promptCard}>
        <span className={styles.label}>Say this aloud:</span>
        <p className={styles.promptText}>{item.prompt}</p>
        <div className={styles.targetBox}>
          <span className={styles.targetText}>{targetText}</span>
          {audioUrl && (
            <button className={styles.playBtn} onClick={() => new Audio(audioUrl).play()}>
              ▶ Listen
            </button>
          )}
        </div>
      </div>

      {!submitted && (
        <div className={styles.hintSection}>
          <button
            className={`${styles.hintBtn} ${showHint ? styles.hintRevealed : ''}`}
            onClick={() => setShowHint(!showHint)}
          >
            {showHint ? hintText : 'Show Hint'}
          </button>
        </div>
      )}

      {!submitted && (
        <div className={styles.inputSection}>
          <div className={styles.recordRow}>
            <button
              className={`${styles.recordBtn} ${recording ? styles.recording : ''}`}
              onClick={handleRecord}
            >
              {recording ? 'Recording... ⏺' : 'Record 🎤'}
            </button>
            <span className={styles.orText}>or type</span>
          </div>
          <input
            className={styles.textInput}
            type="text"
            placeholder="Type what you heard/said..."
            value={userText}
            onChange={e => setUserText(e.target.value)}
            autoFocus
          />
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!userText.trim()}
          >
            Check Pronunciation
          </button>
        </div>
      )}

      {submitted && result && (
        <div className={`${styles.resultCard} ${result === 'correct' ? styles.correct : styles.incorrect}`}>
          <span className={styles.resultIcon}>{result === 'correct' ? '✅' : '❌'}</span>
          <div className={styles.resultDetail}>
            <span className={styles.resultLabel}>
              {result === 'correct' ? 'Perfect!' : 'Not quite'}
            </span>
            {result === 'incorrect' && (
              <span className={styles.resultAnswer}>
                Expected: <strong>{targetText}</strong><br />
                You typed: <em>{userText || '(empty)'}</em>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
