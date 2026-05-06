import React, {useEffect, useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet, Text, View} from 'react-native';

import {openDatabase} from './src/db/database';
import SyncScreen from './src/screens/SyncScreen';
import PracticeScreen from './src/screens/PracticeScreen';

// Hard-coded learner UUID for v1.  In production this would come from
// device fingerprinting or a pre-generated identity stored in AsyncStorage.
const LEARNER_ID = '00000000-0000-0000-0000-000000000001';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [screen, setScreen] = useState<'sync' | 'practice'>('sync');

  useEffect(() => {
    openDatabase().then(() => setDbReady(true));
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>Learnify</Text>
        <Text style={styles.splashSub}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {screen === 'sync' ? (
        <SyncScreen
          learnerId={LEARNER_ID}
        />
      ) : (
        <PracticeScreen
          learnerId={LEARNER_ID}
          onDone={() => setScreen('sync')}
        />
      )}
      <View style={styles.tabBar}>
        <Text
          style={[styles.tab, screen === 'sync' && styles.tabActive]}
          onPress={() => setScreen('sync')}
        >
          Sync
        </Text>
        <Text
          style={[styles.tab, screen === 'practice' && styles.tabActive]}
          onPress={() => setScreen('practice')}
        >
          Practice
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#fff'},
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563eb',
  },
  splashTitle: {fontSize: 32, fontWeight: '800', color: '#fff'},
  splashSub: {fontSize: 16, color: '#bfdbfe', marginTop: 8},
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    color: '#94a3b8',
    paddingVertical: 8,
  },
  tabActive: {color: '#2563eb', fontWeight: '600'},
});
