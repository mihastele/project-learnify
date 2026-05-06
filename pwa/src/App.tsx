import {useEffect, useState} from 'react';

import {openDatabase} from './db/database';
import ClassroomScreen from './screens/ClassroomScreen';
import LearnScreen from './screens/LearnScreen';
import PracticeScreen from './screens/PracticeScreen';
import StatsScreen from './components/StatsScreen';
import BadgeWall from './components/BadgeWall';
import Leaderboard from './components/Leaderboard';
import TeacherDashboard from './components/TeacherDashboard';
import SyncScreen from './screens/SyncScreen';

import {ContentUnit, GamificationSummary, LeaderboardEntry} from './api/types';
import {fetchGamificationSummary, fetchLeaderboard, fetchBadges} from './api/client';
import styles from './App.module.css';

const LEARNER_ID = '00000000-0000-0000-0000-000000000001';

type Tab = 'classroom' | 'stats' | 'leaderboard' | 'teacher' | 'sync';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [tab, setTab] = useState<Tab>('classroom');
  const [selectedLesson, setSelectedLesson] = useState<ContentUnit | null>(null);
  const [practicing, setPracticing] = useState(false);

  // Gamification state
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    openDatabase().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    Promise.all([
      fetchGamificationSummary(LEARNER_ID).catch(() => null),
      fetchLeaderboard(20).catch(() => []),
      fetchBadges(LEARNER_ID).catch(() => []),
    ]).then(([game, leader]) => {
      if (game) setGamification(game);
      setLeaderboard(leader);
    });
  }, [dbReady, tab]);

  const handleStartLesson = (lesson: ContentUnit) => {
    setSelectedLesson(lesson);
  };

  const handleStartPractice = () => {
    setPracticing(true);
  };

  const handlePracticeDone = (sessionStats: {correct: number; incorrect: number; partial: number; xpEarned: number}) => {
    setPracticing(false);
    // Refresh gamification data
    fetchGamificationSummary(LEARNER_ID)
      .then(setGamification)
      .catch(() => {});
    fetchLeaderboard(20)
      .then(setLeaderboard)
      .catch(() => {});
  };

  const handlePracticeCancel = () => {
    setPracticing(false);
  };

  if (!dbReady) {
    return (
      <div className={styles.splash}>
        <h1 className={styles.splashTitle}>Learnify</h1>
        <span className={styles.splashSub}>Loading...</span>
      </div>
    );
  }

  // Practice overlay
  if (practicing && selectedLesson) {
    return (
      <PracticeScreen
        learnerId={LEARNER_ID}
        lessonId={selectedLesson.id}
        onDone={handlePracticeDone}
        onCancel={handlePracticeCancel}
      />
    );
  }

  // Lesson view
  if (selectedLesson && tab === 'classroom') {
    return (
      <div className={styles.root}>
        <main className={styles.main}>
          <LearnScreen
            lesson={selectedLesson}
            onStartPractice={handleStartPractice}
            onBack={() => setSelectedLesson(null)}
          />
        </main>
      </div>
    );
  }

  const stats = gamification?.stats;
  const badges = gamification?.badges;

  return (
    <div className={styles.root}>
      <main className={styles.main}>
        {tab === 'classroom' && (
          <ClassroomScreen
            learnerId={LEARNER_ID}
            onStartLesson={handleStartLesson}
          />
        )}

        {tab === 'stats' && stats && (
          <div className={styles.statsContainer}>
            <StatsScreen
              xp={stats.xp}
              level={stats.level}
              xpForNextLevel={stats.xp_for_next_level}
              progress={stats.progress_to_next_level}
              streak={stats.current_streak}
              longestStreak={stats.longest_streak}
              totalCorrect={stats.total_correct}
              totalIncorrect={stats.total_incorrect}
              totalSessions={stats.total_sessions}
              dailyXpGoal={stats.daily_xp_goal}
              dailyXpEarned={stats.daily_xp_earned}
            />
            {badges && badges.length > 0 && (
              <div style={{padding: '0 16px 20px'}}>
                <BadgeWall
                  badges={(badges || []).map(b => b.badge)}
                  earned={badges || []}
                />
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && !stats && (
          <div className={styles.emptyState}>
            <span>Start practicing to see your stats!</span>
          </div>
        )}

        {tab === 'leaderboard' && (
          <div className={styles.statsContainer} style={{paddingTop: 20}}>
            <Leaderboard entries={leaderboard} currentLearnerId={LEARNER_ID} />
          </div>
        )}

        {tab === 'teacher' && <TeacherDashboard />}

        {tab === 'sync' && <SyncScreen learnerId={LEARNER_ID} />}
      </main>

      <nav className={styles.tabBar}>
        <button
          className={`${styles.tab} ${tab === 'classroom' ? styles.tabActive : ''}`}
          onClick={() => { setSelectedLesson(null); setTab('classroom'); }}
        >
          <span className={styles.tabIcon}>📚</span>
          <span className={styles.tabLabel}>Learn</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'stats' ? styles.tabActive : ''}`}
          onClick={() => setTab('stats')}
        >
          <span className={styles.tabIcon}>📊</span>
          <span className={styles.tabLabel}>Stats</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'leaderboard' ? styles.tabActive : ''}`}
          onClick={() => setTab('leaderboard')}
        >
          <span className={styles.tabIcon}>🏆</span>
          <span className={styles.tabLabel}>Rank</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'teacher' ? styles.tabActive : ''}`}
          onClick={() => setTab('teacher')}
        >
          <span className={styles.tabIcon}>📝</span>
          <span className={styles.tabLabel}>Teach</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'sync' ? styles.tabActive : ''}`}
          onClick={() => setTab('sync')}
        >
          <span className={styles.tabIcon}>🔄</span>
          <span className={styles.tabLabel}>Sync</span>
        </button>
      </nav>
    </div>
  );
}
