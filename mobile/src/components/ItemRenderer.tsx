import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {Item} from '../api/types';

import MCQItemView from './MCQItemView';
import ClozeItemView from './ClozeItemView';
import TrueFalseItemView from './TrueFalseItemView';
import ListenAnswerItemView from './ListenAnswerItemView';
import SpeakRepeatItemView from './SpeakRepeatItemView';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

/**
 * Dispatches to the correct item-type renderer based on ``item.item_type``.
 * If the type is unknown, renders a fallback message.
 */
export default function ItemRenderer({item, onAnswer}: Props) {
  switch (item.item_type) {
    case 'MCQ':
      return <MCQItemView item={item} onAnswer={onAnswer} />;
    case 'CLOZE':
      return <ClozeItemView item={item} onAnswer={onAnswer} />;
    case 'TRUE_FALSE':
      return <TrueFalseItemView item={item} onAnswer={onAnswer} />;
    case 'LISTEN_ANSWER':
      return <ListenAnswerItemView item={item} onAnswer={onAnswer} />;
    case 'SPEAK_REPEAT':
      return <SpeakRepeatItemView item={item} onAnswer={onAnswer} />;
    default:
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            Unknown item type: {item.item_type}
          </Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  fallback: {padding: 16, alignItems: 'center'},
  fallbackText: {fontSize: 16, color: '#888'},
});
