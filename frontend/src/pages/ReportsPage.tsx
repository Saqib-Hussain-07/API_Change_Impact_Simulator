import { useQuery } from 'react-query';
import { reportsApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export function ReportsPage() {
  const { data, isLoading } = useQuery('reports', () => reportsApi.list());
  const reports = data?.reports ?? [];
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
            Audit & Compliance
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">API Migration & Sign-Off Reports</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Formal sign-off records, release gates, and architectural risk assessments
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card p-12 text-center bg-[#09090b] border border-white/10">
          <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white mb-1">No sign-off reports recorded</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Reports and release decisions are generated during diff review workflows.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r: Record<string, unknown>) => {
            const overview = r.overview as Record<string, number> | null;
            const decision = r.decision as string | undefined;
            return (
              <div
                key={r.id as string}
                onClick={() => navigate(`/diffs/${r.diff_run_id}`)}
                className="glass-card p-5 bg-[#0b0b0d] border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {decision === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 text-[11px] font-mono font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>APPROVED FOR RELEASE</span>
                        </span>
                      ) : decision === 'blocked' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/40 text-[11px] font-mono font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>BLOCKED PENDING FIXES</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-white/10 text-[11px] font-mono">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>PENDING DECISION</span>
                        </span>
                      )}

                      <span className="font-mono text-xs text-zinc-500">
                        Diff Run: {String(r.diff_run_id).slice(0, 8)}
                      </span>
                    </div>

                    {overview && (
                      <div className="flex items-center gap-3 font-mono text-xs flex-wrap mt-2">
                        <span className="text-rose-400 font-semibold">
                          {overview.breaking} Breaking
                        </span>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-amber-400 font-semibold">
                          {overview.warnings} Warnings
                        </span>
                        <span className="text-zinc-600">&bull;</span>
                        <span className="text-zinc-300">
                          {overview.affectedConsumers} Consumers Affected
                        </span>
                        {(overview.testRunsFailing as number) > 0 && (
                          <>
                            <span className="text-zinc-600">&bull;</span>
                            <span className="text-rose-400 font-bold">
                              {overview.testRunsFailing} Mock Suites Failed
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-3 text-[11px] text-zinc-500 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(r.generated_at as string).toLocaleString()}</span>
                      {r.approved_by_email && (
                        <>
                          <span>&bull;</span>
                          <span>Authorized by <span className="text-zinc-300">{r.approved_by_email as string}</span></span>
                        </>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
