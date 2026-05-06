import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import {syncAll} from '../services/syncService';
import {
  getLastContentSyncTime,
  getLastProgressSyncTime,
} from '../db/database';

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
    <View style={styles.container}>
      <Text style={styles.title}>Sync</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Content last synced</Text>
        <Text style={styles.value}>
          {lastContentSync ? new Date(lastContentSync).toLocaleString() : 'Never'}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Progress last synced</Text>
        <Text style={styles.value}>
          {lastProgressSync ? new Date(lastProgressSync).toLocaleString() : 'Never'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.btn, syncing && styles.btnDisabled]}
        onPress={handleSync}
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Sync Now</Text>
        )}
      </TouchableOpacity>
      {result && (
        <View style={styles.result}>
          <Text style={styles.resultText}>
            Content units imported: {result.contentImported}
          </Text>
          <Text style={styles.resultText}>
            Progress records synced: {result.progressSynced}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 16, backgroundColor: '#fff'},
  title: {fontSize: 24, fontWeight: '700', marginBottom: 20},
  card: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  label: {fontSize: 13, color: '#64748b'},
  value: {fontSize: 16, marginTop: 4, color: '#1e293b'},
  btn: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  btnDisabled: {backgroundColor: '#a0aec0'},
  btnText: {color: '#fff', fontSize: 17, fontWeight: '600'},
  result: {marginTop: 20, padding: 14, backgroundColor: '#f0fdf4', borderRadius: 8},
  resultText: {fontSize: 15, color: '#166534', marginBottom: 4},
});
