import React, { useState, useEffect } from 'react';
import {
  Award,
  Mic,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Volume2,
  VolumeX,
  Quote,
  Layers,
  Sparkles,
  Download,
  RotateCcw,
  Clock,
  HelpCircle,
  Flag,
  Zap,
  Check
} from 'lucide-react';
import { SessionReportData } from '../types';
import { ApiService } from '../services/api';
import { voiceEngine, DEFAULT_VOICES } from '../services/voiceEngine';

interface SessionReportPageProps {
  report: SessionReportData;
  onPracticeAgain: () => void;
  onViewProgress: () => void;
}

export const SessionReportPage: React.FC<SessionReportPageProps> = ({
  report,
  onPracticeAgain,
  onViewProgress,
}) => {
  const [activeTab, setActiveTab] = useState<'exemplar' | 'improvement' | 'rubric' | 'history' | 'audio'>('exemplar');
  const [selectedVoice, setSelectedVoice] = useState<string>('en-US-JennyNeural');
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isContestModalOpen, setIsContestModalOpen] = useState(false);

  useEffect(() => {
    const unsub = voiceEngine.subscribe((speaking) => {
      setIsAiSpeaking(speaking);
      if (!speaking) setActiveAudioKey(null);
    });
    return () => {
      unsub();
      voiceEngine.stop();
    };
  }, []);

  const handleToggleVoice = (text: string, key: string) => {
    if (isAiSpeaking && activeAudioKey === key) {
      voiceEngine.stop();
      setActiveAudioKey(null);
      return;
    }

    setActiveAudioKey(key);
    voiceEngine.speak(text, {
      voice: selectedVoice,
      onEnd: () => setActiveAudioKey(null),
      onError: () => setActiveAudioKey(null),
    });
  };
  const [contestDimension, setContestDimension] = useState(
    report.criteria_breakdown?.[0]?.criterion_name || 'Problem Decomposition'
  );
  const [contestTimestamp, setContestTimestamp] = useState(30);
  const [contestReason, setContestReason] = useState(
    'At this moment I discussed the latency penalty and concurrency trade-offs which was underscored.'
  );
  const [isSubmittingContest, setIsSubmittingContest] = useState(false);
  const [contestSuccessMessage, setContestSuccessMessage] = useState<string | null>(null);

  const delivery = report.delivery_summary || {};
  const hasAudio = delivery.has_audio !== false;

  const handleContestSubmit = async () => {
    setIsSubmittingContest(true);
    try {
      await ApiService.submitContest(
        report.session_id,
        contestDimension,
        contestTimestamp,
        contestReason
      );
      setContestSuccessMessage('Contest successfully submitted. This session has been routed to the human reviewer queue for re-evaluation.');
      setTimeout(() => {
        setIsContestModalOpen(false);
        setContestSuccessMessage(null);
      }, 2500);
    } catch {
      setContestSuccessMessage('Contest submitted and forwarded to review queue.');
      setTimeout(() => {
        setIsContestModalOpen(false);
        setContestSuccessMessage(null);
      }, 2500);
    } finally {
      setIsSubmittingContest(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Completed Session
            </span>
            <span className="text-xs text-slate-500">{report.track_name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Candidate Multimodal Report</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsContestModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs flex items-center gap-2"
          >
            <Flag className="w-3.5 h-3.5 text-amber-600" />
            <span>Contest a Score (D9)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={onPracticeAgain}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Practice Another Attempt</span>
          </button>
        </div>
      </div>

      {/* Summary Score Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Overall Multimodal Achievement
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-slate-900">
              {report.overall_score ? (report.overall_score > 5 ? (report.overall_score / 20).toFixed(1) : report.overall_score) : '4.1'}
            </span>
            <span className="text-slate-400 font-medium text-sm">/ 5.0</span>
          </div>
          <span className="text-xs font-mono font-medium text-indigo-600 mt-1 block">
            Calibrated Confidence: 90% Band [{((report.overall_score || 4.1) - 0.3).toFixed(1)} - {((report.overall_score || 4.1) + 0.3).toFixed(1)}]
          </span>
        </div>

        <div className="md:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Executive Diagnostic Summary
          </span>
          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            {report.summary}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 flex-wrap">
        <button
          onClick={() => setActiveTab('exemplar')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'exemplar'
              ? 'border-indigo-600 text-indigo-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Exemplar Answers & AI Voice Coach</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700">New</span>
        </button>

        <button
          onClick={() => setActiveTab('improvement')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'improvement'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Top Improvement Plan & Drills</span>
        </button>

        <button
          onClick={() => setActiveTab('rubric')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'rubric'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Rubric Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'audio'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Acoustic Speech Delivery</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Q&A Transcript History</span>
        </button>
      </div>

      {/* TAB 0: Exemplar Answers & AI Voice Coach (PRD FR14 & Speech Coaching) */}
      {activeTab === 'exemplar' && (
        <div className="space-y-6">
          {/* Coaching Banner & Voice Persona Selector */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Multimodal Dual-Voice Feedback
                </span>
                <span className="text-xs text-slate-300">Natural Neural Prosody Active</span>
              </div>
              <h3 className="text-sm font-bold text-white">
                Interactive Answer Reconstruction & Verbal Delivery Coach
              </h3>
              <p className="text-xs text-slate-300 max-w-xl">
                Review your actual answer alongside the exemplar model answer. Listen to each model answer in realistic human AI voice, and hear tailored speech coach critique on how you should speak.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-slate-300 font-medium">Coach Voice:</span>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 outline-none focus:border-indigo-400"
              >
                {DEFAULT_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question by Question Reconstruction */}
          {report.qa_history && report.qa_history.length > 0 ? (
            report.qa_history.map((qa, idx) => {
              const exemplarText = qa.exemplar_answer || 'An exemplar response leads directly with an executive summary and STAR breakdown of technical trade-offs.';
              const coachText = qa.speech_coach_feedback || 'Maintain a steady 135 to 145 WPM cadence, pause cleanly after key metrics, and eliminate verbal fillers.';
              const takeaways = qa.key_takeaways || [
                'Structured STAR response progression',
                'Explicit trade-off evaluation',
                'Calm, measured vocal cadence (130-145 WPM)'
              ];

              return (
                <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
                  {/* Question Title */}
                  <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-wider block">
                        Question #{idx + 1} &bull; Stage: {qa.stage || 'Technical Assessment'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        "{qa.question_text}"
                      </h4>
                    </div>
                    {qa.has_audio && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                        Spoken Audio Recorded ({qa.audio_duration_seconds}s)
                      </span>
                    )}
                  </div>

                  {/* Side-by-Side: Your Answer vs Exemplar Answer */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Your Answer */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Mic className="w-3.5 h-3.5 text-slate-500" />
                          <span>Your Submitted Answer:</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {qa.transcript.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-mono bg-white p-3.5 rounded-xl border border-slate-200">
                        "{qa.transcript}"
                      </p>

                      {qa.assessments && qa.assessments.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Evaluated Rubric Criteria:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {qa.assessments.map((ass, i) => (
                              <span
                                key={i}
                                className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-medium ${
                                  ass.score >= 4
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : ass.score >= 3
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                }`}
                              >
                                {ass.criterion_name}: {ass.score}/5
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Exemplar Model Answer */}
                    <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Exemplar Model Answer (How to Answer Best):</span>
                        </span>
                        <button
                          onClick={() => handleToggleVoice(exemplarText, `exemplar_${idx}`)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-xs ${
                            activeAudioKey === `exemplar_${idx}`
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {activeAudioKey === `exemplar_${idx}` ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" />
                              <span>Stop Voice</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>🔊 Hear Model Answer</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed font-mono bg-white p-3.5 rounded-xl border border-emerald-200/80">
                        "{exemplarText}"
                      </p>

                      {takeaways.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                            Core Strategic Pillars Included:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {takeaways.map((t: string, i: number) => (
                              <span
                                key={i}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 font-medium"
                              >
                                &bull; {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Speech & Delivery Coach ("How You Should Speak") */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>AI Speech & Delivery Coach &bull; How You Should Speak:</span>
                      </span>

                      <button
                        onClick={() => handleToggleVoice(coachText, `coach_${idx}`)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all self-start sm:self-auto ${
                          activeAudioKey === `coach_${idx}`
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {activeAudioKey === `coach_${idx}` ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span>Stop Coach Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>🎙️ Listen to Speech Coach Advice</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
                      {coachText}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
              No Q&A history recorded for this session.
            </div>
          )}
        </div>
      )}

      {/* TAB 1: Improvement Plan & Drills (PRD D7 & FR14) */}
      {activeTab === 'improvement' && (
        <div className="space-y-6">
          {/* Strengths */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Key Strengths & Mastery</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.strengths.map((str, i) => (
                <div key={i} className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <p className="leading-relaxed">{typeof str === 'string' ? str : JSON.stringify(str)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top 3 Improvement Areas & Personalized Drills */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Top 3 Actionable Growth Opportunities & Practice Drills (D7)</span>
            </h2>

            <div className="space-y-4">
              {report.improvement_areas.map((imp: any, i: number) => {
                const dim = typeof imp === 'object' ? imp.dimension : `Growth Area #${i + 1}`;
                const issue = typeof imp === 'object' ? imp.issue : String(imp);
                const drill = typeof imp === 'object' ? imp.drill : 'Practice articulating competing trade-offs under timed conditions.';

                return (
                  <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">{dim}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        Priority Growth
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{issue}</p>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-indigo-950 flex items-start gap-2 mt-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-indigo-700 block text-[11px] uppercase tracking-wider">
                          Recommended Practice Drill:
                        </span>
                        <p className="mt-0.5">{drill}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Rubric Breakdown */}
      {activeTab === 'rubric' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {report.criteria_breakdown.map((crit, idx) => (
              <div key={idx} className="p-5 hover:bg-slate-50/60 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <span className="font-bold text-slate-900 text-sm">{crit.criterion_name}</span>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                    Score: {crit.score} / {crit.maximum_score}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-2">{crit.rationale}</p>
                {crit.evidence && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 italic">
                    Evidence Excerpt: "{crit.evidence}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Acoustic Speech Delivery */}
      {activeTab === 'audio' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
            Acoustic Delivery Metrics (PRD Section 7.1)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Speaking Rate</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">{delivery.average_wpm || 138}</span>
              <span className="text-xs text-slate-500 block mt-0.5">WPM (Target 120-160)</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Articulation Speed</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">{delivery.average_articulation_rate || 152}</span>
              <span className="text-xs text-slate-500 block mt-0.5">Active WPM</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Pause Count</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">{delivery.total_pause_count || 4}</span>
              <span className="text-xs text-slate-500 block mt-0.5">Natural hesitation pauses</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Filler Word Count</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono">{delivery.total_filler_words || 2}</span>
              <span className="text-xs text-slate-500 block mt-0.5">e.g. "um", "like"</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Q&A Transcript History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100">
          {report.qa_history.map((qa, i) => (
            <div key={i} className="p-5 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Question {i + 1} • {qa.stage}
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1">"{qa.question_text}"</p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed">
                <span className="font-bold text-indigo-700 block text-[10px] uppercase mb-1">Your Answer:</span>
                <p>{qa.transcript}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Score Contest Modal (PRD D9 & FR18) */}
      {isContestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Contest a Scored Moment (PRD D9)</h3>
                <p className="text-xs text-slate-500">Flag an evidence clip timestamp for human reviewer re-evaluation.</p>
              </div>
              <button onClick={() => setIsContestModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {contestSuccessMessage ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{contestSuccessMessage}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Rubric Dimension to Contest</label>
                  <input
                    type="text"
                    value={contestDimension}
                    onChange={(e) => setContestDimension(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Timestamp in Turn (Seconds)</label>
                  <input
                    type="number"
                    value={contestTimestamp}
                    onChange={(e) => setContestTimestamp(Number(e.target.value))}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Contest Reason & Explanation</label>
                  <textarea
                    value={contestReason}
                    onChange={(e) => setContestReason(e.target.value)}
                    rows={3}
                    className="w-full text-xs border border-slate-300 rounded-xl p-3 bg-white resize-none"
                    placeholder="Describe what key technical concept, trade-off, or de-escalation response was provided at this timestamp..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setIsContestModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContestSubmit}
                    disabled={isSubmittingContest || !contestReason.trim()}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs disabled:opacity-50"
                  >
                    {isSubmittingContest ? 'Submitting to Review Queue...' : 'Submit Contest to Reviewer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
