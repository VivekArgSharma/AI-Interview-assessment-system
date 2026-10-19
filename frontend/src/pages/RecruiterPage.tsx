import React, { useState, useEffect } from 'react';
import { Briefcase, Sparkles, Link2, Plus, Clock, Copy, Check, ArrowRight, ShieldAlert, BarChart3, Loader2 } from 'lucide-react';
import { ApiService } from '../services/api';
import { RoleData, DraftRubricResult, InviteData } from '../types';

interface RecruiterPageProps {
  onViewScorecard: (sessionId: string) => void;
}

export const RecruiterPage: React.FC<RecruiterPageProps> = ({ onViewScorecard }) => {
  const [roles, setRoles] = useState<RoleData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form State
  const [jobTitle, setJobTitle] = useState<string>('Senior Backend Infrastructure Engineer');
  const [jdText, setJdText] = useState<string>(
    'We are looking for a senior backend engineer to lead microservices reliability, troubleshoot intermittent network timeout retry storms, and build high-throughput payment reconciliation systems.'
  );
  const [scenarioType, setScenarioType] = useState<string>('S1');
  const [durationMinutes, setDurationMinutes] = useState<number>(20);
  const [deliveryWeight, setDeliveryWeight] = useState<number>(0.20);
  const [draftResult, setDraftResult] = useState<DraftRubricResult | null>(null);

  // Invite modal state
  const [activeInviteRole, setActiveInviteRole] = useState<RoleData | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<InviteData | null>(null);
  const [candidateEmail, setCandidateEmail] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getRoles();
      setRoles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftRubric = async () => {
    if (!jobTitle || !jdText) return;
    setIsDrafting(true);
    try {
      const res = await ApiService.draftRubric({
        job_title: jobTitle,
        jd_text: jdText,
        scenario_type: scenarioType
      });
      setDraftResult(res);
      setDeliveryWeight(res.delivery_weight);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDrafting(false);
    }
  };

  const handleCreateRole = async () => {
    setIsCreating(true);
    try {
      const newRole = await ApiService.createRole({
        title: jobTitle,
        jd_text: jdText,
        scenario_type: scenarioType,
        duration_minutes: durationMinutes,
        video_enabled: true,
        delivery_weight: deliveryWeight,
        presentation_weight: 0.0,
        criteria: draftResult?.dimensions || []
      });
      setRoles((prev) => [newRole, ...prev]);
      alert(`Role "${newRole.title}" created successfully with rubric!`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!activeInviteRole) return;
    try {
      const inv = await ApiService.createInvite(activeInviteRole.id, {
        candidate_email: candidateEmail || undefined,
        expiry_days: 14
      });
      setGeneratedInvite(inv);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInvite) return;
    const fullUrl = `${window.location.origin}${generatedInvite.invite_url}`;
    navigator.clipboard.writeText(fullUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruiter Role Builder & Invites</h1>
          <p className="text-xs text-slate-500 mt-1">
            Draft AI rubrics from Job Descriptions, configure scenario simulations (S1-S3, N1-N3), and generate single-use candidate invite links.
          </p>
        </div>
        <button
          onClick={() => onViewScorecard('prism-demo-session-s1')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors shadow-xs"
        >
          <BarChart3 className="w-4 h-4" />
          <span>View Demo Recruiter Scorecard</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Role Builder Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Briefcase className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Create New Interview Role</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. Distributed Systems Engineer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-800">Job Description (JD Text)</label>
              <button
                onClick={handleDraftRubric}
                disabled={isDrafting || !jdText}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50"
              >
                {isDrafting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Draft Rubric with AI</span>
              </button>
            </div>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={4}
              className="w-full text-xs border border-slate-300 rounded-xl p-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
              placeholder="Paste job description requirements, technical stack, or consultative competencies..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">Scenario Type</label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="S1">S1: Failing Service (Code Fix)</option>
                <option value="S2">S2: Pull Request Review</option>
                <option value="S3">S3: Teammate Incident Triage</option>
                <option value="N1">N1: Angry Customer (Late Refund)</option>
                <option value="N2">N2: Hesitant Parent (Screen Time)</option>
                <option value="N3">N3: Difficult Colleague (Handoff)</option>
                <option value="standard">Standard Domain Q&A</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Delivery Weight ({Math.round(deliveryWeight * 100)}%)
              </label>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.05"
                value={deliveryWeight}
                onChange={(e) => setDeliveryWeight(Number(e.target.value))}
                className="w-full accent-indigo-600 mt-2"
              />
            </div>
          </div>

          {/* AI Generated Rubric Preview */}
          {draftResult && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
                AI Drafted Rubric Dimensions ({draftResult.dimensions.length} criteria)
              </span>
              <div className="space-y-2">
                {draftResult.dimensions.map((dim, i) => (
                  <div key={i} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{dim.criterion_name}</span>
                      <p className="text-[11px] text-slate-500">{dim.description}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Weight: {dim.weight}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleCreateRole}
            disabled={isCreating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs disabled:opacity-50 transition-all"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Save & Publish Role</span>
          </button>
        </div>

        {/* Right Column: Roles & Invite Links */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active Interview Roles</h2>
            <span className="text-xs text-slate-400">{roles.length} roles</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400">Loading roles...</div>
          ) : (
            <div className="space-y-3">
              {roles.map((r) => (
                <div key={r.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{r.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {r.scenario_type}
                        </span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {r.duration_minutes}m
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setActiveInviteRole(r);
                        setGeneratedInvite(null);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Invite</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{r.jd_text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {activeInviteRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Generate Candidate Invite Link</h3>
              <button onClick={() => setActiveInviteRole(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>
            <p className="text-xs text-slate-500 mb-4">Role: <strong>{activeInviteRole.title}</strong></p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Candidate Email (Optional)</label>
                <input
                  type="email"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  placeholder="candidate@example.com"
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:outline-hidden"
                />
              </div>

              {!generatedInvite ? (
                <button
                  onClick={handleGenerateInvite}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700"
                >
                  Generate Single-Use Link
                </button>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Invite Ready (Valid for 14 Days)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}${generatedInvite.invite_url}`}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                      title="Copy"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
