import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {Item} from '../../api/types';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

/**
 * Listen-and-answer: plays audio, learner types a response.
 * The audio_url is in item.metadata.  For the v1, the UI shows a placeholder
 * "Play audio" button and a text input for the answer.
 */
export default function ListenAnswerItemView({item, onAnswer}: Props) {
  const [value, setValue] = useState('');
  const [playing, setPlaying] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    // In a full implementation, use react-native-sound or expo-av to play
    // the audio from item.metadata.audio_url.  For v1 this is a visual toggle.
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
    <View style={styles.container}>
      <Text style={styles.prompt}>{item.prompt}</Text>
      <TouchableOpacity
        style={[styles.playBtn, playing && styles.playBtnActive]}
        onPress={handlePlay}
        disabled={playing}
      >
        <Text style={styles.playText}>
          {playing ? 'Playing...' : 'Play Audio\u25B6'}
        </Text>
      </TouchableOpacity>
      <TextInput
        style={[styles.input, submitted && styles.inputDisabled]}
        value={value}
        onChangeText={setValue}
        placeholder="Type what you heard..."
        editable={!submitted}
        autoCapitalize="none"
      />
      {submitted && (
        <Text style={styles.reveal}>
          Correct answer: {item.metadata.correct_answer || '-'}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.submitBtn, (!value.trim() || submitted) && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!value.trim() || submitted}
      >
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16},
  prompt: {fontSize: 18, marginBottom: 20, lineHeight: 26},
  playBtn: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },
  playBtnActive: {backgroundColor: '#a0aec0'},
  playText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  inputDisabled: {backgroundColor: '#f0f0f0'},
  reveal: {fontSize: 14, color: '#555', marginBottom: 10, fontStyle: 'italic'},
  submitBtn: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnDisabled: {backgroundColor: '#a0aec0'},
  submitText: {color: '#fff', fontSize: 16, fontWeight: '600'},
});
