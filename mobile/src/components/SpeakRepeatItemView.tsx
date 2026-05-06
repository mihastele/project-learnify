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

/**
 * Speak-and-repeat: shows a prompt, learner records themselves (placeholder
 * button for v1), then self-assesses.
 */
export default function SpeakRepeatItemView({item, onAnswer}: Props) {
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const handleRecord = useCallback(() => {
    setRecording(true);
    // In a full implementation, use react-native-audio-record or expo-av
    // to record audio.  For v1 this is a visual toggle.
    setTimeout(() => {
      setRecording(false);
      setRecorded(true);
    }, 2000);
  }, []);

  const handleSelfAssess = useCallback((correct: boolean) => {
    onAnswer(correct, {self_assessment: correct ? 'CORRECT' : 'INCORRECT'});
  }, [onAnswer]);

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{item.prompt}</Text>
      <TouchableOpacity
        style={[styles.recordBtn, recording && styles.recordBtnActive]}
        onPress={handleRecord}
        disabled={recording}
      >
        <Text style={styles.recordText}>
          {recording ? 'Recording...' : recorded ? 'Record Again\u23FA' : 'Start Recording\u23FA'}
        </Text>
      </TouchableOpacity>
      {recorded && (
        <View style={styles.assessment}>
          <Text style={styles.assessLabel}>How did you do?</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.assessBtn, {backgroundColor: '#c8f7c5'}]}
              onPress={() => handleSelfAssess(true)}
            >
              <Text style={styles.assessText}>Correct</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.assessBtn, {backgroundColor: '#f7c5c5'}]}
              onPress={() => handleSelfAssess(false)}
            >
              <Text style={styles.assessText}>Needs Work</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {padding: 16},
  prompt: {fontSize: 18, marginBottom: 20, lineHeight: 26},
  recordBtn: {
    backgroundColor: '#db2777',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  recordBtnActive: {backgroundColor: '#a0aec0'},
  recordText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  assessment: {marginTop: 10},
  assessLabel: {fontSize: 16, marginBottom: 12, textAlign: 'center'},
  row: {flexDirection: 'row', gap: 12},
  assessBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  assessText: {fontSize: 16, fontWeight: '600'},
});
