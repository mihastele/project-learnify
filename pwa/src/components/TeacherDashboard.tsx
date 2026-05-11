import {useState} from 'react';
import {
  ItemType, LicenseType, LessonCreatePayload, LessonItemPayload, LessonMediaPayload,
} from '../api/types';
import {createLesson} from '../api/client';
import styles from './TeacherDashboard.module.css';

const ITEM_TYPE_OPTIONS: {value: ItemType; label: string}[] = [
  {value: 'MCQ', label: 'Multiple Choice'},
  {value: 'CLOZE', label: 'Fill in the Blank'},
  {value: 'TRUE_FALSE', label: 'True / False'},
  {value: 'LISTEN_ANSWER', label: 'Listen & Answer'},
  {value: 'SPEAK_REPEAT', label: 'Speak & Repeat'},
  {value: 'PRONUNCIATION', label: 'Pronunciation'},
  {value: 'MATH_INPUT', label: 'Math Problem'},
  {value: 'MATCHING', label: 'Match Pairs'},
  {value: 'SORTING', label: 'Sort Order'},
  {value: 'DIAGRAM_LABEL', label: 'Label Diagram'},
  {value: 'WRITING', label: 'Writing'},
  {value: 'ADVANCED_CANVAS_GAME', label: 'Canvas Game'},
];

const SUBJECT_OPTIONS = [
  'LANGUAGE', 'MATH', 'SCIENCE', 'HISTORY', 'GEOGRAPHY', 'ART', 'MUSIC', 'CODING', 'OTHER',
];

const LICENSE_OPTIONS: LicenseType[] = [
  'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'CC0', 'PD', 'ALL_RIGHTS',
];

interface ItemFormData {
  item_type: ItemType;
  prompt: string;
  hint: string;
  correct_answer: string;
  choices: string[];
  correct_index: number;
  audio_url: string;
  target_text: string;
  equation: string;
  pairs_left: string;
  pairs_right: string;
  sort_options: string;
  image_url: string;
  labels: string;
  min_words: number;
  game_slug: string;
  game_time_limit: number;
  game_target_score: number;
  game_max_lives: number;
  game_enemy_count: number;
}

function emptyItemForm(): ItemFormData {
  return {
    item_type: 'MCQ',
    prompt: '',
    hint: '',
    correct_answer: '',
    choices: ['', '', '', ''],
    correct_index: 0,
    audio_url: '',
    target_text: '',
    equation: '',
    pairs_left: '',
    pairs_right: '',
    sort_options: '',
    image_url: '',
    labels: '',
    min_words: 5,
    game_slug: 'collect_coins',
    game_time_limit: 60,
    game_target_score: 5,
    game_max_lives: 3,
    game_enemy_count: 3,
  };
}

export default function TeacherDashboard() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('LANGUAGE');
  const [level, setLevel] = useState('Beginner');
  const [license, setLicense] = useState<LicenseType>('CC-BY');
  const [language, setLanguage] = useState('en');
  const [body, setBody] = useState('');
  const [items, setItems] = useState<ItemFormData[]>([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaType, setMediaType] = useState<'AUDIO' | 'IMAGE' | 'VIDEO' | 'OTHER'>('AUDIO');
  const [mediaList, setMediaList] = useState<LessonMediaPayload[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const addItem = () => setItems(prev => [...prev, emptyItemForm()]);

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, data: Partial<ItemFormData>) => {
    setItems(prev => prev.map((item, i) => (i === idx ? {...item, ...data} : item)));
  };

  const addMedia = () => {
    if (!mediaUrl.trim()) return;
    setMediaList(prev => [...prev, {type: mediaType, url: mediaUrl, caption: mediaCaption}]);
    setMediaUrl('');
    setMediaCaption('');
  };

  const buildItemPayload = (item: ItemFormData): LessonItemPayload => {
    const metadata: Record<string, unknown> = {};
    switch (item.item_type) {
      case 'MCQ':
        metadata.choices = item.choices.filter(Boolean);
        metadata.correct_index = item.correct_index;
        break;
      case 'CLOZE':
      case 'LISTEN_ANSWER':
      case 'TRUE_FALSE':
        metadata.correct_answer = item.correct_answer;
        if (item.item_type === 'LISTEN_ANSWER') metadata.audio_url = item.audio_url;
        break;
      case 'PRONUNCIATION':
        metadata.target_text = item.target_text;
        metadata.audio_url = item.audio_url;
        break;
      case 'MATH_INPUT':
        metadata.correct_answer = item.correct_answer;
        metadata.equation = item.equation;
        break;
      case 'MATCHING': {
        const leftItems = item.pairs_left.split('\n').filter(Boolean);
        const rightItems = item.pairs_right.split('\n').filter(Boolean);
        metadata.pairs = leftItems.map((l, i) => ({left: l, right: rightItems[i] || ''}));
        break;
      }
      case 'SORTING': {
        const opts = item.sort_options.split('\n').filter(Boolean);
        metadata.options = opts;
        metadata.correct_order = opts.map((_: string, i: number) => i);
        break;
      }
      case 'DIAGRAM_LABEL':
        metadata.image_url = item.image_url;
        metadata.labels = item.labels.split('\n').filter(Boolean).map((ans, i) => ({
          id: `label_${i}`, x: 20 + i * 30, y: 50, answer: ans,
        }));
        break;
      case 'WRITING':
        metadata.min_words = item.min_words;
        break;
      case 'ADVANCED_CANVAS_GAME':
        metadata.game_slug = item.game_slug;
        metadata.game_config = {
          time_limit: item.game_time_limit,
          target_score: item.game_target_score,
          max_lives: item.game_max_lives,
          enemy_count: item.game_enemy_count,
          success_condition: { type: 'score_threshold', score: item.game_target_score },
          failure_condition: { type: 'lives_reached_zero' },
        };
        break;
    }
    return {
      item_type: item.item_type,
      prompt: item.prompt,
      hint: item.hint,
      metadata: metadata as any,
    };
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and lesson body are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: LessonCreatePayload = {
        title, description, subject, level, license_type: license,
        language_code: language, body,
        items: items.map(buildItemPayload),
        media: mediaList,
      };
      await createLesson(payload);
      setSaved(true);
    } catch (e: any) {
      setError(e.message || 'Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <span className={styles.successIcon}>✅</span>
          <h2>Lesson Created!</h2>
          <p>Your lesson "{title}" has been published.</p>
          <button className={styles.btnPrimary} onClick={() => {
            setSaved(false);
            setTitle(''); setDescription(''); setBody(''); setItems([]); setMediaList([]);
          }}>
            Create Another Lesson
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Create Lesson</h2>

      {error && <div className={styles.errorBox}>{error}</div>}

      {/* Basic Info */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic Info</h3>
        <input className={styles.input} placeholder="Lesson Title" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className={styles.textarea} placeholder="Short description (optional)" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
        <div className={styles.row3}>
          <select className={styles.select} value={subject} onChange={e => setSubject(e.target.value)}>
            {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className={styles.input} placeholder="Level" value={level} onChange={e => setLevel(e.target.value)} />
          <select className={styles.select} value={license} onChange={e => setLicense(e.target.value as LicenseType)}>
            {LICENSE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Lesson Body */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Lesson Content</h3>
        <input className={styles.input} placeholder="Language code (en, es, fr...)" value={language} onChange={e => setLanguage(e.target.value)} />
        <textarea className={styles.textarea} placeholder="Lesson body text..." value={body} onChange={e => setBody(e.target.value)} rows={6} />
      </div>

      {/* Media */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Media Resources</h3>
        <div className={styles.row3}>
          <select className={styles.select} value={mediaType} onChange={e => setMediaType(e.target.value as any)}>
            <option value="AUDIO">Audio</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
          </select>
          <input className={styles.input} placeholder="Media URL" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} />
          <button className={styles.btnSecondary} onClick={addMedia}>+ Add</button>
        </div>
        {mediaList.length > 0 && (
          <div className={styles.tagList}>
            {mediaList.map((m, i) => (
              <span key={i} className={styles.tag}>
                {m.type}: {m.url?.slice(0, 30)}...
                <button className={styles.tagRemove} onClick={() => setMediaList(prev => prev.filter((_, j) => j !== i))}>✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Items (Quizzes) */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Quiz Items ({items.length})</h3>
          <button className={styles.btnSecondary} onClick={addItem}>+ Add Item</button>
        </div>

        {items.map((item, idx) => (
          <div key={idx} className={styles.itemCard}>
            <div className={styles.itemHeader}>
              <select
                className={styles.select}
                value={item.item_type}
                onChange={e => updateItem(idx, {item_type: e.target.value as ItemType})}
              >
                {ITEM_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button className={styles.btnDanger} onClick={() => removeItem(idx)}>Remove</button>
            </div>

            <input className={styles.input} placeholder="Prompt / Question" value={item.prompt} onChange={e => updateItem(idx, {prompt: e.target.value})} />
            <input className={styles.input} placeholder="Hint (optional)" value={item.hint} onChange={e => updateItem(idx, {hint: e.target.value})} />

            {/* Type-specific fields */}
            {(item.item_type === 'MCQ') && (
              <div className={styles.mcqGrid}>
                <span className={styles.fieldLabel}>Choices (select correct one):</span>
                {item.choices.map((c, ci) => (
                  <label key={ci} className={styles.radioRow}>
                    <input
                      type="radio"
                      name={`correct_${idx}`}
                      checked={item.correct_index === ci}
                      onChange={() => updateItem(idx, {correct_index: ci})}
                    />
                    <input
                      className={styles.input}
                      placeholder={`Choice ${ci + 1}`}
                      value={c}
                      onChange={e => {
                        const newChoices = [...item.choices];
                        newChoices[ci] = e.target.value;
                        updateItem(idx, {choices: newChoices});
                      }}
                    />
                  </label>
                ))}
              </div>
            )}

            {(item.item_type === 'CLOZE' || item.item_type === 'TRUE_FALSE' || item.item_type === 'LISTEN_ANSWER' || item.item_type === 'MATH_INPUT') && (
              <input className={styles.input} placeholder="Correct Answer" value={item.correct_answer} onChange={e => updateItem(idx, {correct_answer: e.target.value})} />
            )}

            {(item.item_type === 'LISTEN_ANSWER' || item.item_type === 'PRONUNCIATION') && (
              <input className={styles.input} placeholder="Audio URL" value={item.audio_url} onChange={e => updateItem(idx, {audio_url: e.target.value})} />
            )}

            {item.item_type === 'PRONUNCIATION' && (
              <input className={styles.input} placeholder="Target text to pronounce" value={item.target_text} onChange={e => updateItem(idx, {target_text: e.target.value})} />
            )}

            {item.item_type === 'MATH_INPUT' && (
              <input className={styles.input} placeholder="Equation (display only)" value={item.equation} onChange={e => updateItem(idx, {equation: e.target.value})} />
            )}

            {item.item_type === 'MATCHING' && (
              <>
                <textarea className={styles.textarea} placeholder="Left items (one per line)" value={item.pairs_left} onChange={e => updateItem(idx, {pairs_left: e.target.value})} rows={3} />
                <textarea className={styles.textarea} placeholder="Right items (one per line, same order)" value={item.pairs_right} onChange={e => updateItem(idx, {pairs_right: e.target.value})} rows={3} />
              </>
            )}

            {item.item_type === 'SORTING' && (
              <textarea className={styles.textarea} placeholder="Items in correct order (one per line)" value={item.sort_options} onChange={e => updateItem(idx, {sort_options: e.target.value})} rows={4} />
            )}

            {item.item_type === 'DIAGRAM_LABEL' && (
              <>
                <input className={styles.input} placeholder="Image URL" value={item.image_url} onChange={e => updateItem(idx, {image_url: e.target.value})} />
                <textarea className={styles.textarea} placeholder="Labels (one per line, in order)" value={item.labels} onChange={e => updateItem(idx, {labels: e.target.value})} rows={3} />
              </>
            )}

            {item.item_type === 'WRITING' && (
              <input className={styles.input} type="number" placeholder="Min words" value={item.min_words} onChange={e => updateItem(idx, {min_words: Number(e.target.value)})} />
            )}

            {item.item_type === 'ADVANCED_CANVAS_GAME' && (
              <div className={styles.canvasGameConfig}>
                <select className={styles.select} value={item.game_slug} onChange={e => updateItem(idx, {game_slug: e.target.value})}>
                  <option value="collect_coins">Collect the Coins</option>
                  <option value="dodge_enemies">Dodge the Enemies</option>
                  <option value="defend_castle">Defend the Castle</option>
                </select>
                <div className={styles.row3}>
                  <label className={styles.fieldLabel}>
                    Time (s):
                    <input className={styles.inputSmall} type="number" value={item.game_time_limit} onChange={e => updateItem(idx, {game_time_limit: Number(e.target.value)})} min={10} max={300} />
                  </label>
                  <label className={styles.fieldLabel}>
                    Target Score:
                    <input className={styles.inputSmall} type="number" value={item.game_target_score} onChange={e => updateItem(idx, {game_target_score: Number(e.target.value)})} min={1} max={100} />
                  </label>
                  <label className={styles.fieldLabel}>
                    Max Lives:
                    <input className={styles.inputSmall} type="number" value={item.game_max_lives} onChange={e => updateItem(idx, {game_max_lives: Number(e.target.value)})} min={1} max={10} />
                  </label>
                </div>
                <div className={styles.row3}>
                  <label className={styles.fieldLabel}>
                    Enemy Count:
                    <input className={styles.inputSmall} type="number" value={item.game_enemy_count} onChange={e => updateItem(idx, {game_enemy_count: Number(e.target.value)})} min={1} max={20} />
                  </label>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <button className={styles.submitBtn} onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Publish Lesson'}
      </button>
    </div>
  );
}
