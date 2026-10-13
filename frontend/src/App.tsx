import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { LiveInterviewRoom } from './components/LiveInterviewRoom';
import { SessionReportPage } from './pages/SessionReportPage';
import { ProgressPage } from './pages/ProgressPage';
import { ModelInsightsPage } from './pages/ModelInsightsPage';
import { InterviewSetupModal } from './components/InterviewSetupModal';
import { AuthModal } from './components/AuthModal';
import { ApiService } from './services/api';
import {
  HealthResponse,
  InterviewTrack,
  InterviewSessionData,
  SessionReportData,
  SessionHistoryItem,
  User
} from './types';
import { AlertCircle, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<
    'dashboard' | 'live_interview' | 'session_report' | 'progress' | 'insights'
  >('dashboard');

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tracks, setTracks] = useState<InterviewTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('sales');
  const [activeSession, setActiveSession] = useState<InterviewSessionData | null>(null);
  const [activeReport, setActiveReport] = useState<SessionReportData | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isStartingSession, setIsStartingSession] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const [healthData, tracksData] = await Promise.all([
        ApiService.getHealth().catch(() => null),
        ApiService.getTracks().catch(() => []),
      ]);

      setHealth(healthData);
      setTracks(tracksData);

      if (tracksData.length > 0 && !tracksData.some((t) => t.id === selectedTrackId)) {
        setSelectedTrackId(tracksData[0].id);
      }

      // Check for logged in user or demo user
      try {
        const user = await ApiService.getMe();
        setCurrentUser(user);
      } catch {
        // User not logged in, demo mode active
      }

      // Load session history
      try {
        const hist = await ApiService.getHistory();
        setHistory(hist);
      } catch {
        // Empty history
      }
    } catch (err: any) {
      console.error('Initialization error:', err);
      setGlobalError(
        'Could not connect to the FastAPI backend at http://127.0.0.1:8000. Ensure the backend server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSession = async (config: {
    trackId: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    durationMinutes: number;
    voicePreference: string;
  }) => {
    setIsStartingSession(true);
    setGlobalError(null);
    try {
      // 1. Create Session
      const session = await ApiService.createSession({
        track_id: config.trackId,
        difficulty: config.difficulty,
        duration_minutes: config.durationMinutes,
        voice_preference: config.voicePreference,
      });

      // 2. Start Session
      const started = await ApiService.startSession(session.id);
      setActiveSession(started);
      setActiveReport(null);
      setIsSetupModalOpen(false);
      setCurrentPage('live_interview');

      // Refresh history
      const hist = await ApiService.getHistory().catch(() => []);
      setHistory(hist);
    } catch (err: any) {
      console.error('Failed to start session:', err);
      setGlobalError(err?.message || 'Failed to start interview session.');
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleSessionFinish = async (reportId?: string) => {
    if (!activeSession) return;
    try {
      setIsLoading(true);
      const report = await ApiService.getSessionReport(activeSession.id);
      setActiveReport(report);
      setCurrentPage('session_report');

      // Refresh history
      const hist = await ApiService.getHistory().catch(() => []);
      setHistory(hist);
    } catch (err) {
      console.error('Failed to fetch session report:', err);
      setGlobalError('Failed to load completed session report.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewReportById = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const report = await ApiService.getSessionReport(sessionId);
      setActiveReport(report);
      setCurrentPage('session_report');
    } catch (err) {
      console.error('Failed to load report:', err);
      setGlobalError('Failed to load requested session report.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(p) => setCurrentPage(p)}
        health={health}
        hasActiveSession={Boolean(activeSession && activeSession.status === 'in_progress')}
        hasActiveReport={Boolean(activeReport)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-4 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-4xl mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-xs uppercase font-bold text-rose-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Page Content */}
      <main className="flex-1 pb-16">
        {isLoading && !activeSession ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Connecting to AI Assessment Engine & Speech Pipeline...
            </p>
          </div>
        ) : (
          <>
            {currentPage === 'dashboard' && (
              <DashboardPage
                tracks={tracks}
                selectedTrackId={selectedTrackId}
                onSelectTrack={(id) => setSelectedTrackId(id)}
                onOpenSetupModal={(trackId) => {
                  if (trackId) setSelectedTrackId(trackId);
                  setIsSetupModalOpen(true);
                }}
                history={history}
                onViewReportById={handleViewReportById}
                currentUser={currentUser}
                onOpenAuthModal={() => setIsAuthModalOpen(true)}
              />
            )}

            {currentPage === 'live_interview' && activeSession && (
              <LiveInterviewRoom
                session={activeSession}
                onSessionUpdate={(s) => setActiveSession(s)}
                onSessionFinish={handleSessionFinish}
                onExit={() => setCurrentPage('dashboard')}
              />
            )}

            {currentPage === 'session_report' && activeReport && (
              <SessionReportPage
                report={activeReport}
                onPracticeAgain={() => {
                  setSelectedTrackId(activeReport.track_id);
                  setIsSetupModalOpen(true);
                }}
                onViewProgress={() => setCurrentPage('progress')}
              />
            )}

            {currentPage === 'progress' && (
              <ProgressPage
                onStartNewPractice={() => setIsSetupModalOpen(true)}
                onViewReportById={handleViewReportById}
              />
            )}

            {currentPage === 'insights' && (
              <ModelInsightsPage
                health={health}
                onRefreshHealth={initializeApp}
              />
            )}
          </>
        )}
      </main>

      {/* Setup Modal */}
      <InterviewSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        tracks={tracks}
        initialTrackId={selectedTrackId}
        onStartSession={handleStartSession}
        isLoading={isStartingSession}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={(u) => setCurrentUser(u)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Multimodal AI Interview Assessment System</span>
            <span>•</span>
            <span>PRD v1.0 Compliant</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Local Whisper ASR • Sentence-BERT Rubric Vectorizer • VAD Speech Analysis
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
