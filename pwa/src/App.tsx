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
import AuthScreen from './components/AuthScreen';

import {ContentUnit, GamificationSummary, LeaderboardEntry} from './api/types';
import {fetchGamificationSummary, fetchLeaderboard, fetchBadges} from './api/client';
import styles from './App.module.css';

const ANON_LEARNER_ID = '00000000-0000-0000-0000-000000000001';

type Tab = 'classroom' | 'stats' | 'leaderboard' | 'teacher' | 'sync' | 'login' | 'profile';

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [tab, setTab] = useState<Tab>('classroom');
  const [selectedLesson, setSelectedLesson] = useState<ContentUnit | null>(null);
  const [practicing, setPracticing] = useState(false);

  // Auth State
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [learnerId, setLearnerId] = useState<string>(ANON_LEARNER_ID);
  const [isTeacherApproved, setIsTeacherApproved] = useState(false);
  const [proposalStatus, setProposalStatus] = useState('NONE');

  // Gamification state
  const [gamification, setGamification] = useState<GamificationSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    openDatabase().then(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    Promise.all([
      fetchGamificationSummary(learnerId).catch(() => null),
      fetchLeaderboard(20).catch(() => []),
      fetchBadges(learnerId).catch(() => []),
    ]).then(([game, leader]) => {
      if (game) setGamification(game);
      setLeaderboard(leader);
    });
  }, [dbReady, tab, learnerId]);

  const handleStartLesson = (lesson: ContentUnit) => {
    setSelectedLesson(lesson);
  };

  const handleStartPractice = () => {
    setPracticing(true);
  };

  const handlePracticeDone = (sessionStats: {correct: number; incorrect: number; partial: number; xpEarned: number}) => {
    setPracticing(false);
    // Refresh gamification data
    fetchGamificationSummary(learnerId)
      .then(setGamification)
      .catch(() => {});
    fetchLeaderboard(20)
      .then(setLeaderboard)
      .catch(() => {});
  };

  const handlePracticeCancel = () => {
    setPracticing(false);
  };

  const handleAuthSuccess = (token: string, newLearnerId: string, approved: boolean, status: string) => {
    setAuthToken(token);
    setLearnerId(newLearnerId);
    setIsTeacherApproved(approved);
    setProposalStatus(status);
    if (approved) {
      setTab('teacher');
    } else {
      setTab('profile');
    }
  };

  const handleRequestAccess = async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`http://localhost:8000/api/learners/${learnerId}/request_teacher_access/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${authToken}`
        }
      });
      if (res.ok) {
        setProposalStatus('PENDING');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!dbReady) {
    return (
      <div className={styles.splash}>
        <img src="/logo.png" alt="Learnify Logo" style={{width: 120, height: 120, marginBottom: 20, borderRadius: '50%'}} />
        <h1 className={styles.splashTitle}>Learnify</h1>
        <span className={styles.splashSub}>Loading...</span>
      </div>
    );
  }

  // Practice overlay
  if (practicing && selectedLesson) {
    return (
      <PracticeScreen
        learnerId={learnerId}
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
            learnerId={learnerId}
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
            <Leaderboard entries={leaderboard} currentLearnerId={learnerId} />
          </div>
        )}

        {tab === 'login' && !authToken && (
          <AuthScreen onAuthSuccess={handleAuthSuccess} />
        )}

        {tab === 'profile' && authToken && !isTeacherApproved && (
          <div className={styles.emptyState}>
            <h2>Teacher Access Required</h2>
            <p style={{marginBottom: 20}}>You must be an approved teacher to publish lessons.</p>
            {proposalStatus === 'PENDING' ? (
              <div style={{color: '#eab308'}}>Your request is pending admin approval...</div>
            ) : proposalStatus === 'REJECTED' ? (
              <div style={{color: '#ef4444'}}>Your request was rejected.</div>
            ) : (
              <button 
                onClick={handleRequestAccess}
                style={{
                  padding: '12px 24px', backgroundColor: '#2563eb', color: 'white', 
                  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                Request Teacher Access
              </button>
            )}
          </div>
        )}

        {tab === 'profile' && authToken && isTeacherApproved && (
           <div className={styles.emptyState}>
             <h2>Profile</h2>
             <p>You are an approved teacher!</p>
           </div>
        )}

        {tab === 'teacher' && authToken && isTeacherApproved && (
          <TeacherDashboard />
        )}

        {tab === 'sync' && <SyncScreen learnerId={learnerId} />}
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
        {authToken && isTeacherApproved && (
          <button
            className={`${styles.tab} ${tab === 'teacher' ? styles.tabActive : ''}`}
            onClick={() => setTab('teacher')}
          >
            <span className={styles.tabIcon}>📝</span>
            <span className={styles.tabLabel}>Teach</span>
          </button>
        )}
        {!authToken && (
          <button
            className={`${styles.tab} ${tab === 'login' ? styles.tabActive : ''}`}
            onClick={() => setTab('login')}
          >
            <span className={styles.tabIcon}>👤</span>
            <span className={styles.tabLabel}>Login</span>
          </button>
        )}
        {authToken && !isTeacherApproved && (
          <button
            className={`${styles.tab} ${tab === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setTab('profile')}
          >
            <span className={styles.tabIcon}>👤</span>
            <span className={styles.tabLabel}>Profile</span>
          </button>
        )}
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
