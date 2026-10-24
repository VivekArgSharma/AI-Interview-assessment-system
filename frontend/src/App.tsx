import React, { useState, useEffect } from 'react';
import { Navbar, UserRole } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { LiveInterviewRoom } from './components/LiveInterviewRoom';
import { SessionReportPage } from './pages/SessionReportPage';
import { ProgressPage } from './pages/ProgressPage';
import { ModelInsightsPage } from './pages/ModelInsightsPage';
import { RecruiterPage } from './pages/RecruiterPage';
import { ScorecardPage } from './pages/ScorecardPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { EvaluationDashboardPage } from './pages/EvaluationDashboardPage';
import { AdminPrivacyPage } from './pages/AdminPrivacyPage';
import { MockInterviewStudioPage } from './pages/MockInterviewStudioPage';
import { PortalLoginPage } from './pages/PortalLoginPage';
import { InterviewSetupModal } from './components/InterviewSetupModal';
import { ConsentModal } from './components/ConsentModal';
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
  const [activeRole, setActiveRole] = useState<UserRole>('candidate');
  const [currentPage, setCurrentPage] = useState<string>('portal_login');


  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [tracks, setTracks] = useState<InterviewTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('bug_fixing');
  const [activeSession, setActiveSession] = useState<InterviewSessionData | null>(null);
  const [activeReport, setActiveReport] = useState<SessionReportData | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reviewQueueCount, setReviewQueueCount] = useState<number>(1);
  const [scorecardSessionId, setScorecardSessionId] = useState<string>('prism-demo-session-s1');

  // Modals
  const [isSetupModalOpen, setIsSetupModalOpen] = useState<boolean>(false);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState<boolean>(false);
  const [pendingSessionConfig, setPendingSessionConfig] = useState<{
    trackId: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    durationMinutes: number;
    voicePreference: string;
    scenarioId?: string;
  } | null>(null);

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

      // Check current user and route to appropriate portal
      try {
        const user = await ApiService.getMe();
        setCurrentUser(user);
        if (user.role === 'recruiter') {
          setActiveRole('recruiter');
          setCurrentPage('recruiter');
        } else if (user.role === 'reviewer') {
          setActiveRole('reviewer');
          setCurrentPage('reviewer');
        } else if (user.role === 'admin') {
          setActiveRole('admin');
          setCurrentPage('eval_dashboard');
        } else {
          setActiveRole('candidate');
          setCurrentPage('mock_practice');
        }
      } catch {
        // User not logged in, show portal selection & dummy login gateway
        setCurrentPage('portal_login');
      }


      // Load session history
      try {
        const hist = await ApiService.getHistory();
        setHistory(hist);
      } catch {
        // Empty history
      }

      // Check review queue count
      try {
        const queue = await ApiService.getReviewQueue();
        setReviewQueueCount(queue.length);
      } catch {
        // fallback
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

  const handleRoleSelect = (role: UserRole) => {
    setActiveRole(role);
    if (role === 'candidate') {
      setCurrentPage('dashboard');
    } else if (role === 'recruiter') {
      setCurrentPage('recruiter');
    } else if (role === 'reviewer') {
      setCurrentPage('reviewer');
    } else if (role === 'admin') {
      setCurrentPage('eval_dashboard');
    }
  };

  const handleSetupModalSubmit = async (config: {
    trackId: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    durationMinutes: number;
    voicePreference: string;
  }) => {
    setPendingSessionConfig(config);
    setIsSetupModalOpen(false);
    setIsConsentModalOpen(true);
  };

  const handleQuickStartScenario = (scenarioId: string, trackId: string) => {
    setSelectedTrackId(trackId);
    setPendingSessionConfig({
      trackId,
      difficulty: 'intermediate',
      durationMinutes: 20,
      voicePreference: 'echo',
      scenarioId
    });
    setIsConsentModalOpen(true);
  };

  const handleConfirmConsent = async (consentData: {
    audio_consent: boolean;
    video_consent: boolean;
    retention_ttl_hours: number;
    extra_time_accommodations: boolean;
  }) => {
    setIsConsentModalOpen(false);
    if (!pendingSessionConfig) return;

    setIsStartingSession(true);
    setGlobalError(null);
    try {
      // 1. Create Session
      const session = await ApiService.createSession({
        track_id: pendingSessionConfig.trackId,
        difficulty: pendingSessionConfig.difficulty,
        duration_minutes: pendingSessionConfig.durationMinutes,
        voice_preference: pendingSessionConfig.voicePreference,
      });

      // 2. Start Session with scenario and consent
      const started = await ApiService.startSession(
        session.id,
        pendingSessionConfig.scenarioId,
        consentData.video_consent
      );

      setActiveSession(started);
      setActiveReport(null);
      setCurrentPage('live_interview');

      // Refresh history
      const hist = await ApiService.getHistory().catch(() => []);
      setHistory(hist);
    } catch (err: any) {
      console.error('Failed to start session:', err);
      setGlobalError(err?.message || 'Failed to start interview session.');
    } finally {
      setIsStartingSession(false);
      setPendingSessionConfig(null);
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

  const handleViewScorecard = (sessionId: string) => {
    setScorecardSessionId(sessionId);
    setCurrentPage('scorecard');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      {/* Professional White Mode Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(p) => setCurrentPage(p)}
        health={health}
        hasActiveSession={Boolean(activeSession && activeSession.status === 'in_progress')}
        hasActiveReport={Boolean(activeReport)}
        activeRole={activeRole}
        onSelectRole={handleRoleSelect}
        reviewQueueCount={reviewQueueCount}
        currentUser={currentUser}
        onSwitchPortal={() => {
          ApiService.logout();
          setCurrentUser(null);
          setCurrentPage('portal_login');
        }}
      />


      {/* Global Error Banner */}
      {globalError && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-2.5 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-7xl mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-xs uppercase font-bold text-rose-700 hover:text-rose-900 px-2 py-1 rounded-sm hover:bg-rose-100 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Page Content */}
      <main className="flex-1 pb-16">
        {isLoading && !activeSession ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Connecting to PRISM Assessment Engine & Modality Pipeline...
            </p>
          </div>
        ) : (
          <>
            {/* Gateway Portal & Dummy Login Page */}
            {currentPage === 'portal_login' && (
              <PortalLoginPage
                onLoginSuccess={(user, role) => {
                  setCurrentUser(user);
                  setActiveRole(role);
                  if (role === 'candidate') {
                    setCurrentPage('mock_practice');
                  } else if (role === 'recruiter') {
                    setCurrentPage('recruiter');
                  } else if (role === 'reviewer') {
                    setCurrentPage('reviewer');
                  } else {
                    setCurrentPage('eval_dashboard');
                  }
                }}
              />
            )}

            {/* Candidate Views */}
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
                onQuickStartScenario={handleQuickStartScenario}
                onNavigateToMockStudio={() => setCurrentPage('mock_practice')}
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

            {currentPage === 'mock_practice' && (
              <MockInterviewStudioPage />
            )}

            {/* Recruiter Views */}
            {currentPage === 'recruiter' && (
              <RecruiterPage onViewScorecard={handleViewScorecard} />
            )}

            {currentPage === 'scorecard' && (
              <ScorecardPage
                sessionId={scorecardSessionId}
                onBack={() => setCurrentPage(activeRole === 'recruiter' ? 'recruiter' : 'reviewer')}
              />
            )}

            {/* Reviewer Views */}
            {currentPage === 'reviewer' && (
              <ReviewQueuePage
                onRefreshCount={(count) => setReviewQueueCount(count)}
              />
            )}

            {/* Admin / Governance Views */}
            {currentPage === 'eval_dashboard' && (
              <EvaluationDashboardPage />
            )}

            {currentPage === 'admin_privacy' && (
              <AdminPrivacyPage />
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
        onStartSession={handleSetupModalSubmit}
        isLoading={isStartingSession}
      />

      {/* PRISM Privacy Pre-Flight & Consent Modal (FR23/FR24) */}
      <ConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => {
          setIsConsentModalOpen(false);
          setPendingSessionConfig(null);
        }}
        onConfirmConsent={handleConfirmConsent}
        roleTitle={
          pendingSessionConfig?.scenarioId
            ? `Scenario: ${pendingSessionConfig.scenarioId}`
            : tracks.find((t) => t.id === pendingSessionConfig?.trackId)?.name || 'Standard Multimodal Assessment'
        }
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={(u) => setCurrentUser(u)}
      />

      {/* Professional White Mode Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="font-bold text-slate-900">PRISM</span>
            <span>•</span>
            <span>Multimodal Interview Assessment Platform</span>
            <span>•</span>
            <span className="text-indigo-600 font-semibold">PRD Compliant</span>
          </div>
          <div className="text-[11px] text-slate-500">
            5-Head Deep Ensemble • Calibrated Uncertainty [ci_low, ci_high] • Privacy-by-Default (24h TTL)
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
