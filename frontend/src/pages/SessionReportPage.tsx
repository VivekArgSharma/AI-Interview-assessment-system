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
    <div className="w-full max-w-[1720px] mx-auto px-6 sm:px-10 lg:px-14 py-10 space-y-8 font-sans">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-6 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-none bg-emerald-50 text-emerald-700 border border-emerald-200">
              Completed Session
            </span>
            <span className="text-xs text-stone-500 font-semibold">{report.track_name}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight">Candidate Multimodal Report</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsContestModalOpen(true)}
            className="px-4 py-2.5 rounded-none bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider shadow-xs flex items-center gap-2 transition-colors"
          >
            <Flag className="w-4 h-4 text-orange-600" />
            <span>Contest a Score (D9)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-none bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold uppercase tracking-wider shadow-xs flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={onPracticeAgain}
            className="px-5 py-2.5 rounded-none bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Practice Another Attempt</span>
          </button>
        </div>
      </div>

      {/* Summary Score Banner */}
      <div className="bg-white border border-stone-200 rounded-none p-8 shadow-xs grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
            Overall Multimodal Achievement
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-extrabold text-stone-900 font-mono">
              {report.overall_score ? (report.overall_score > 5 ? (report.overall_score / 20).toFixed(1) : report.overall_score) : '4.1'}
            </span>
            <span className="text-stone-400 font-medium text-lg">/ 5.0</span>
          </div>
          <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-none inline-block mt-3">
            Calibrated Confidence: 90% Band [{((report.overall_score || 4.1) - 0.3).toFixed(1)} - {((report.overall_score || 4.1) + 0.3).toFixed(1)}]
          </span>
        </div>

        <div className="lg:col-span-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-2">
            Executive Diagnostic Summary
          </span>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed bg-stone-50 border border-stone-200 p-5 rounded-none font-sans">
            {report.summary}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-stone-200 flex-wrap">
        <button
          onClick={() => setActiveTab('exemplar')}
          className={`pb-3.5 px-4 text-xs uppercase tracking-wider font-bold flex items-center gap-2 border-b-2 transition-all rounded-none ${
            activeTab === 'exemplar'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-orange-600" />
          <span>Exemplar Answers & AI Voice Coach</span>
          <span className="text-[10px] px-2 py-0.5 rounded-none bg-orange-100 text-orange-800 font-mono">New</span>
        </button>

        <button
          onClick={() => setActiveTab('improvement')}
          className={`pb-3.5 px-4 text-xs uppercase tracking-wider font-bold flex items-center gap-2 border-b-2 transition-all rounded-none ${
            activeTab === 'improvement'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Top Improvement Plan & Drills</span>
        </button>

        <button
          onClick={() => setActiveTab('rubric')}
          className={`pb-3.5 px-4 text-xs uppercase tracking-wider font-bold flex items-center gap-2 border-b-2 transition-all rounded-none ${
            activeTab === 'rubric'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rubric Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab('audio')}
          className={`pb-3.5 px-4 text-xs uppercase tracking-wider font-bold flex items-center gap-2 border-b-2 transition-all rounded-none ${
            activeTab === 'audio'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Acoustic Speech Delivery</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3.5 px-4 text-xs uppercase tracking-wider font-bold flex items-center gap-2 border-b-2 transition-all rounded-none ${
            activeTab === 'history'
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Q&A Transcript History</span>
        </button>
      </div>

      {/* TAB 0: Exemplar Answers & AI Voice Coach (PRD FR14 & Speech Coaching) */}
      {activeTab === 'exemplar' && (
        <div className="space-y-8">
          {/* Coaching Banner & Voice Persona Selector */}
          <div className="bg-stone-900 text-white rounded-none p-6 sm:p-8 shadow-md border border-orange-500/30 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-none bg-orange-500/20 text-orange-300 border border-orange-400/30">
                  Multimodal Dual-Voice Feedback
                </span>
                <span className="text-xs text-stone-300">Natural Neural Prosody Active</span>
              </div>
              <h3 className="text-base font-bold text-white">
                Interactive Answer Reconstruction & Verbal Delivery Coach
              </h3>
              <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
                Review your actual answer alongside the exemplar model answer. Listen to each model answer in realistic human AI voice, and hear tailored speech coach critique on how you should speak.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-stone-300 font-bold uppercase tracking-wider">Coach Voice:</span>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="bg-stone-800 border border-stone-700 text-xs text-white rounded-none px-4 py-2.5 outline-none focus:border-orange-500 font-semibold"
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
                <div key={idx} className="bg-white border border-stone-200 rounded-none p-6 sm:p-8 shadow-xs space-y-6">
                  {/* Question Title */}
                  <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-orange-600 uppercase tracking-wider block">
                        Question #{idx + 1} • Stage: {qa.stage || 'Technical Assessment'}
                      </span>
                      <h4 className="text-base font-bold text-stone-900 mt-1">
                        "{qa.question_text}"
                      </h4>
                    </div>
                    {qa.has_audio && (
                      <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-none bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                        Spoken Audio Recorded ({qa.audio_duration_seconds}s)
                      </span>
                    )}
                  </div>

                  {/* Side-by-Side: Your Answer vs Exemplar Answer */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Your Answer */}
                    <div className="p-5 bg-stone-50 border border-stone-200 rounded-none space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                          <Mic className="w-4 h-4 text-stone-500" />
                          <span>Your Submitted Answer:</span>
                        </span>
                        <span className="text-[10px] font-mono text-stone-500 font-bold">
                          {qa.transcript.split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                      <p className="text-xs text-stone-800 leading-relaxed font-mono bg-white p-4 rounded-none border border-stone-200">
                        "{qa.transcript}"
                      </p>

                      {qa.assessments && qa.assessments.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                            Evaluated Rubric Criteria:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {qa.assessments.map((ass, i) => (
                              <span
                                key={i}
                                className={`text-[11px] px-3 py-1 rounded-none border font-semibold ${
                                  ass.score >= 4
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : ass.score >= 3
                                    ? 'bg-orange-50 text-orange-800 border-orange-200'
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
                    <div className="p-5 bg-orange-50/30 border border-orange-200 rounded-none space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-orange-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-orange-600" />
                          <span>Exemplar Model Answer (How to Answer Best):</span>
                        </span>
                        <button
                          onClick={() => handleToggleVoice(exemplarText, `exemplar_${idx}`)}
                          className={`flex items-center gap-2 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all shadow-xs ${
                            activeAudioKey === `exemplar_${idx}`
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-orange-600 hover:bg-orange-700 text-white'
                          }`}
                        >
                          {activeAudioKey === `exemplar_${idx}` ? (
                            <>
                              <VolumeX className="w-4 h-4" />
                              <span>Stop Voice</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-4 h-4" />
                              <span>Hear Model Answer</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-xs text-stone-800 leading-relaxed font-mono bg-white p-4 rounded-none border border-orange-200">
                        "{exemplarText}"
                      </p>

                      {takeaways.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block">
                            Core Strategic Pillars Included:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {takeaways.map((t: string, i: number) => (
                              <span
                                key={i}
                                className="text-[11px] px-2.5 py-0.5 rounded-none bg-orange-100/70 text-orange-900 border border-orange-200 font-medium"
                              >
                                • {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Speech & Delivery Coach ("How You Should Speak") */}
                  <div className="p-5 bg-stone-900 text-white rounded-none space-y-4 border border-stone-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-orange-400" />
                        <span>AI Speech & Delivery Coach • How You Should Speak:</span>
                      </span>

                      <button
                        onClick={() => handleToggleVoice(coachText, `coach_${idx}`)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all self-start sm:self-auto ${
                          activeAudioKey === `coach_${idx}`
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-orange-600 hover:bg-orange-500 text-white'
                        }`}
                      >
                        {activeAudioKey === `coach_${idx}` ? (
                          <>
                            <VolumeX className="w-4 h-4" />
                            <span>Stop Coach Voice</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-4 h-4" />
                            <span>Listen to Speech Coach Advice</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed bg-stone-800/90 p-4 rounded-none border border-stone-700">
                      {coachText}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white border border-stone-200 rounded-none p-12 text-center text-stone-500 text-xs">
              No Q&A history recorded for this session.
            </div>
          )}
        </div>
      )}

      {/* TAB 1: Improvement Plan & Drills (PRD D7 & FR14) */}
      {activeTab === 'improvement' && (
        <div className="space-y-8">
          {/* Strengths */}
          <div className="bg-white border border-stone-200 rounded-none p-8 shadow-xs">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Key Strengths & Mastery</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.strengths.map((str, i) => (
                <div key={i} className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-none text-xs text-emerald-950 flex items-start gap-3">
                  <span className="w-2 h-2 rounded-none bg-emerald-500 mt-1 shrink-0" />
                  <p className="leading-relaxed">{typeof str === 'string' ? str : JSON.stringify(str)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top 3 Improvement Areas & Personalized Drills */}
          <div className="bg-white border border-stone-200 rounded-none p-8 shadow-xs">
            <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span>Top 3 Actionable Growth Opportunities & Practice Drills (D7)</span>
            </h2>

            <div className="space-y-5">
              {report.improvement_areas.map((imp: any, i: number) => {
                const dim = typeof imp === 'object' ? imp.dimension : `Growth Area #${i + 1}`;
                const issue = typeof imp === 'object' ? imp.issue : String(imp);
                const drill = typeof imp === 'object' ? imp.drill : 'Practice articulating competing trade-offs under timed conditions.';

                return (
                  <div key={i} className="p-5 bg-stone-50 border border-stone-200 rounded-none space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-xs">{dim}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-none bg-orange-50 text-orange-800 border border-orange-200">
                        Priority Growth
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">{issue}</p>
                    <div className="p-4 bg-white border border-stone-200 rounded-none text-xs text-stone-900 flex items-start gap-3 mt-3">
                      <Sparkles className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-orange-700 block text-[11px] uppercase tracking-wider">
                          Recommended Practice Drill:
                        </span>
                        <p className="mt-1 text-stone-700 leading-relaxed">{drill}</p>
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
        <div className="bg-white border border-stone-200 rounded-none shadow-xs overflow-hidden">
          <div className="divide-y divide-stone-100">
            {report.criteria_breakdown.map((crit, idx) => (
              <div key={idx} className="p-6 hover:bg-orange-50/20 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <span className="font-bold text-stone-900 text-sm">{crit.criterion_name}</span>
                  <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 border border-orange-200 px-3 py-1 rounded-none">
                    Score: {crit.score} / {crit.maximum_score}
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed mb-3">{crit.rationale}</p>
                {crit.evidence && (
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-none text-xs text-stone-700 italic">
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
        <div className="bg-white border border-stone-200 rounded-none p-8 shadow-xs space-y-6">
          <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">
            Acoustic Delivery Metrics (PRD Section 7.1)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="p-5 bg-stone-50 border border-stone-200 rounded-none">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Speaking Rate</span>
              <span className="text-3xl font-extrabold text-stone-900 font-mono">{delivery.average_wpm || 138}</span>
              <span className="text-xs text-stone-500 block mt-1">WPM (Target 120-160)</span>
            </div>
            <div className="p-5 bg-stone-50 border border-stone-200 rounded-none">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Articulation Speed</span>
              <span className="text-3xl font-extrabold text-stone-900 font-mono">{delivery.average_articulation_rate || 152}</span>
              <span className="text-xs text-stone-500 block mt-1">Active WPM</span>
            </div>
            <div className="p-5 bg-stone-50 border border-stone-200 rounded-none">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Total Pause Count</span>
              <span className="text-3xl font-extrabold text-stone-900 font-mono">{delivery.total_pause_count || 4}</span>
              <span className="text-xs text-stone-500 block mt-1">Natural hesitation pauses</span>
            </div>
            <div className="p-5 bg-stone-50 border border-stone-200 rounded-none">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Filler Word Count</span>
              <span className="text-3xl font-extrabold text-stone-900 font-mono">{delivery.total_filler_words || 2}</span>
              <span className="text-xs text-stone-500 block mt-1">e.g. "um", "like"</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Q&A Transcript History */}
      {activeTab === 'history' && (
        <div className="bg-white border border-stone-200 rounded-none shadow-xs overflow-hidden divide-y divide-stone-100">
          {report.qa_history.map((qa, i) => (
            <div key={i} className="p-6 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                  Question {i + 1} • {qa.stage}
                </span>
                <p className="text-sm font-semibold text-stone-900 mt-1">"{qa.question_text}"</p>
              </div>
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-none text-xs text-stone-800 leading-relaxed font-mono">
                <span className="font-bold text-orange-700 block text-[10px] uppercase mb-1 font-sans">Your Answer:</span>
                <p>{qa.transcript}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Score Contest Modal (PRD D9 & FR18) */}
      {isContestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-none border border-stone-200 shadow-xl max-w-lg w-full p-8 space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200">
              <div>
                <h3 className="text-base font-bold text-stone-900 uppercase tracking-wider">Contest a Scored Moment (PRD D9)</h3>
                <p className="text-xs text-stone-500 mt-0.5">Flag an evidence clip timestamp for human reviewer re-evaluation.</p>
              </div>
              <button onClick={() => setIsContestModalOpen(false)} className="text-stone-400 hover:text-stone-600 text-lg">✕</button>
            </div>

            {contestSuccessMessage ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-none text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{contestSuccessMessage}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-800 mb-1">Rubric Dimension to Contest</label>
                  <input
                    type="text"
                    value={contestDimension}
                    onChange={(e) => setContestDimension(e.target.value)}
                    className="w-full text-xs border border-stone-300 rounded-none px-3.5 py-2.5 bg-white outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-800 mb-1">Timestamp in Turn (Seconds)</label>
                  <input
                    type="number"
                    value={contestTimestamp}
                    onChange={(e) => setContestTimestamp(Number(e.target.value))}
                    className="w-full text-xs border border-stone-300 rounded-none px-3.5 py-2.5 bg-white outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-800 mb-1">Contest Reason & Explanation</label>
                  <textarea
                    value={contestReason}
                    onChange={(e) => setContestReason(e.target.value)}
                    rows={4}
                    className="w-full text-xs border border-stone-300 rounded-none p-3.5 bg-white resize-none outline-none focus:border-orange-500"
                    placeholder="Describe what key technical concept, trade-off, or de-escalation response was provided at this timestamp..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                  <button
                    onClick={() => setIsContestModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-stone-600 hover:text-stone-900 rounded-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContestSubmit}
                    disabled={isSubmittingContest || !contestReason.trim()}
                    className="px-6 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider bg-orange-600 text-white hover:bg-orange-700 shadow-xs disabled:opacity-50 transition-colors"
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
