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
    <View style={styles.container}>
      <Text style={styles.prompt}>{item.prompt}</Text>
      <TextInput
        style={[styles.input, submitted && styles.inputDisabled]}
        value={value}
        onChangeText={setValue}
        placeholder="Type your answer..."
        editable={!submitted}
        autoCapitalize="none"
      />
      {submitted && (
        <Text style={styles.reveal}>
          Correct answer: {item.metadata.correct_answer || item.metadata.blank_word}
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
