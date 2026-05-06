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

export default function TrueFalseItemView({item, onAnswer}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const correctAnswer: boolean = item.metadata.correct_answer !== false;

  const handlePress = useCallback((choice: boolean) => {
    if (submitted) return;
    setSubmitted(true);
    const correct = choice === correctAnswer;
    setTimeout(() => onAnswer(correct, {choice}), 400);
  }, [submitted, correctAnswer, onAnswer]);

  const btnStyle = (highlightAs: boolean): object => {
    if (!submitted) return {};
    if (highlightAs === correctAnswer) return {backgroundColor: '#c8f7c5'};
    return {backgroundColor: '#f7c5c5'};
  };

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{item.prompt}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, btnStyle(true)]}
          onPress={() => handlePress(true)}
          disabled={submitted}
        >
          <Text style={styles.btnText}>True</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, btnStyle(false)]}
          onPress={() => handlePress(false)}
          disabled={submitted}
        >
          <Text style={styles.btnText}>False</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16},
  prompt: {fontSize: 18, marginBottom: 20, lineHeight: 26},
  row: {flexDirection: 'row', gap: 16, justifyContent: 'center'},
  btn: {
    flex: 1,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  btnText: {fontSize: 18, fontWeight: '600'},
});
