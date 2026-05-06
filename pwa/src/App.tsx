import {useEffect, useState} from 'react';

import {openDatabase} from './db/database';
import SyncScreen from './screens/SyncScreen';
import PracticeScreen from './screens/PracticeScreen';
import styles from './App.module.css';

const LEARNER_ID = '00000000-0000-0000-0000-000000000001';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [screen, setScreen] = useState<'sync' | 'practice'>('sync');

  useEffect(() => {
    openDatabase().then(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <div className={styles.splash}>
        <h1 className={styles.splashTitle}>Learnify</h1>
        <span className={styles.splashSub}>Loading...</span>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <main className={styles.main}>
        {screen === 'sync' ? (
          <SyncScreen learnerId={LEARNER_ID} />
        ) : (
          <PracticeScreen
            learnerId={LEARNER_ID}
            onDone={() => setScreen('sync')}
          />
        )}
      </main>
      <nav className={styles.tabBar}>
        <button
          className={`${styles.tab} ${screen === 'sync' ? styles.tabActive : ''}`}
          onClick={() => setScreen('sync')}
        >
          Sync
        </button>
        <button
          className={`${styles.tab} ${screen === 'practice' ? styles.tabActive : ''}`}
          onClick={() => setScreen('practice')}
        >
          Practice
        </button>
      </nav>
    </div>
  );
}
