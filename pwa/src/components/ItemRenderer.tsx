import {Item} from '../api/types';

import MCQItemView from './MCQItemView';
import ClozeItemView from './ClozeItemView';
import TrueFalseItemView from './TrueFalseItemView';
import ListenAnswerItemView from './ListenAnswerItemView';
import SpeakRepeatItemView from './SpeakRepeatItemView';
import PronunciationItemView from './PronunciationItemView';
import MathInputItemView from './MathInputItemView';
import MatchingItemView from './MatchingItemView';
import SortingItemView from './SortingItemView';
import DiagramLabelItemView from './DiagramLabelItemView';
import WritingItemView from './WritingItemView';
import styles from './ItemRenderer.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

const TYPE_COMPONENT: Record<string, string> = {
  MCQ: 'Multiple Choice',
  CLOZE: 'Fill in the Blank',
  TRUE_FALSE: 'True or False',
  LISTEN_ANSWER: 'Listen & Answer',
  SPEAK_REPEAT: 'Speak & Repeat',
  PRONUNCIATION: 'Pronunciation',
  MATH_INPUT: 'Math Problem',
  MATCHING: 'Match Pairs',
  SORTING: 'Sort Order',
  DIAGRAM_LABEL: 'Label Diagram',
  WRITING: 'Writing',
};

export default function ItemRenderer({item, onAnswer}: Props) {
  const typeLabel = TYPE_COMPONENT[item.item_type] || item.item_type;

  const renderItem = () => {
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
      case 'PRONUNCIATION':
        return <PronunciationItemView item={item} onAnswer={onAnswer} />;
      case 'MATH_INPUT':
        return <MathInputItemView item={item} onAnswer={onAnswer} />;
      case 'MATCHING':
        return <MatchingItemView item={item} onAnswer={onAnswer} />;
      case 'SORTING':
        return <SortingItemView item={item} onAnswer={onAnswer} />;
      case 'DIAGRAM_LABEL':
        return <DiagramLabelItemView item={item} onAnswer={onAnswer} />;
      case 'WRITING':
        return <WritingItemView item={item} onAnswer={onAnswer} />;
      default:
        return (
          <div className={styles.fallback}>
            <span className={styles.fallbackText}>
              Unknown item type: {item.item_type}
            </span>
          </div>
        );
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.typeBadge}>{typeLabel}</span>
        {item.points > 0 && (
          <span className={styles.pointsBadge}>+{item.points} XP</span>
        )}
      </div>
      {renderItem()}
    </div>
  );
}
