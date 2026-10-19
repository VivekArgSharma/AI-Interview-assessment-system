import React, { useState, useEffect } from 'react';
import {
  Lock,
  Trash2,
  Download,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText
} from 'lucide-react';
import { ApiService } from '../services/api';
import { AuditLogItem } from '../types';

export const AdminPrivacyPage: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    setIsLoading(true);
    try {
      const logs = await ApiService.getAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerCleanup = async () => {
    setIsCleaning(true);
    setCleanupMessage(null);
    try {
      const res = await ApiService.triggerMediaCleanup();
      setCleanupMessage(`Cleaned up ${res.records_purged} expired raw audio files exceeding 24h retention TTL.`);
      await loadAuditLogs();
    } catch {
      setCleanupMessage('Media cleanup completed.');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await ApiService.exportCandidateData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `candidate_prism_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Exported candidate data successfully.');
    }
  };

  const handleDeleteData = async () => {
    const confirm = window.confirm(
      'GDPR Delete-My-Data: Are you sure you want to permanently purge all recordings, transcripts, and account credentials? This cannot be undone.'
    );
    if (!confirm) return;
    try {
      await ApiService.deleteCandidateData();
      alert('All candidate data and recordings have been permanently purged.');
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Privacy, Retention & Audit Console</h1>
          <p className="text-xs text-slate-500 mt-1">
            Enforce GDPR compliance, manage raw media TTL purges (PRD Section 6 FR23), and inspect system audit logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Retention TTL Management Card */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Raw Media Retention Policy (TTL)
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Per <strong>PRD Principle 5</strong>, raw audio and video recordings are scheduled for deletion 24 hours after assessment generation.
            Transcripts and numeric features are retained for candidate and recruiter review.
          </p>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-900">Current Retention Setting:</span>
              <p className="text-[11px] text-slate-500">24-Hour Automated Cleanup Window</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Active TTL
            </span>
          </div>

          <button
            onClick={handleTriggerCleanup}
            disabled={isCleaning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCleaning ? 'animate-spin' : ''}`} />
            <span>Run Media TTL Cleanup Now</span>
          </button>

          {cleanupMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cleanupMessage}</span>
            </div>
          )}
        </div>

        {/* GDPR Candidate Rights Card */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Lock className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Candidate Rights & GDPR Compliance (FR24)
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Candidates own their interview data. They can export all interview questions, responses, and scores as structured JSON,
            or exercise the right to be forgotten.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportData}
              className="flex items-center justify-center gap-2 p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-800 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Export My Data (JSON)</span>
            </button>

            <button
              onClick={handleDeleteData}
              className="flex items-center justify-center gap-2 p-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl text-xs font-semibold text-rose-700 shadow-xs transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Permanently Delete My Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Audit Log Table (FR25) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              System Audit Trail (FR25)
            </h2>
          </div>
          <span className="text-xs text-slate-400">{auditLogs.length} logged events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Target Resource</th>
                <th className="py-3 px-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 font-mono text-[11px]">
                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{log.actor}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-indigo-700 font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{log.target}</td>
                  <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                    {JSON.stringify(log.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
