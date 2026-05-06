import {useEffect, useState, useCallback} from 'react';
import {syncAll} from '../services/syncService';
import {
  getLastContentSyncTime,
  getLastProgressSyncTime,
} from '../db/database';
import styles from './SyncScreen.module.css';

interface Props {
  learnerId: string;
}

export default function SyncScreen({learnerId}: Props) {
  const [syncing, setSyncing] = useState(false);
  const [lastContentSync, setLastContentSync] = useState<string | null>(null);
  const [lastProgressSync, setLastProgressSync] = useState<string | null>(null);
  const [result, setResult] = useState<{contentImported: number; progressSynced: number} | null>(null);

  useEffect(() => {
    getLastContentSyncTime().then(setLastContentSync);
    getLastProgressSyncTime().then(setLastProgressSync);
  }, [result]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await syncAll(learnerId);
      setResult(res);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [learnerId]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Sync</h2>
      <div className={styles.card}>
        <span className={styles.label}>Content last synced</span>
        <span className={styles.value}>
          {lastContentSync ? new Date(lastContentSync).toLocaleString() : 'Never'}
        </span>
      </div>
      <div className={styles.card}>
        <span className={styles.label}>Progress last synced</span>
        <span className={styles.value}>
          {lastProgressSync ? new Date(lastProgressSync).toLocaleString() : 'Never'}
        </span>
      </div>
      <button
        className={`${styles.btn} ${syncing ? styles.btnDisabled : ''}`}
        onClick={handleSync}
        disabled={syncing}
      >
        {syncing ? <span className={styles.spinner} /> : 'Sync Now'}
      </button>
      {result && (
        <div className={styles.result}>
          <span className={styles.resultText}>
            Content units imported: {result.contentImported}
          </span>
          <span className={styles.resultText}>
            Progress records synced: {result.progressSynced}
          </span>
        </div>
      )}
    </div>
  );
}
