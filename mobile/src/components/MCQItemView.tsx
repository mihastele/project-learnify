import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {Item} from '../../api/types';

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
    <View style={styles.container}>
      <Text style={styles.prompt}>{item.prompt}</Text>
      <View style={styles.choices}>
        {choices.map((choice, index) => {
          const isSelected = selected === index;
          const isCorrect = index === correct_index;
          let bgColor = '#f0f0f0';
          if (submitted) {
            if (isCorrect) bgColor = '#c8f7c5';
            else if (isSelected && !isCorrect) bgColor = '#f7c5c5';
          } else if (isSelected) {
            bgColor = '#d0e8ff';
          }
          return (
            <TouchableOpacity
              key={index}
              style={[styles.choice, {backgroundColor: bgColor}]}
              onPress={() => handleChoose(index)}
              disabled={submitted}
            >
              <Text style={styles.choiceText}>{choice}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[styles.submitBtn, selected === null && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={selected === null || submitted}
      >
        <Text style={styles.submitText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16},
  prompt: {fontSize: 18, marginBottom: 20, lineHeight: 26},
  choices: {gap: 10},
  choice: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  choiceText: {fontSize: 16},
  submitBtn: {
    marginTop: 20,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitBtnDisabled: {backgroundColor: '#a0aec0'},
  submitText: {color: '#fff', fontSize: 16, fontWeight: '600'},
});
