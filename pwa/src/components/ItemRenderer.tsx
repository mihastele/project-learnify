import {Item} from '../api/types';

import MCQItemView from './MCQItemView';
import ClozeItemView from './ClozeItemView';
import TrueFalseItemView from './TrueFalseItemView';
import ListenAnswerItemView from './ListenAnswerItemView';
import SpeakRepeatItemView from './SpeakRepeatItemView';
import styles from './ItemRenderer.module.css';

interface Props {
  item: Item;
  onAnswer: (correct: boolean, response: Record<string, unknown>) => void;
}

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
        <div className={styles.fallback}>
          <span className={styles.fallbackText}>
            Unknown item type: {item.item_type}
          </span>
        </div>
      );
  }
}
