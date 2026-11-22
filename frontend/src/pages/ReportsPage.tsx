import { useQuery } from 'react-query';
import { reportsApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

export function ReportsPage() {
  const { data, isLoading, isError } = useQuery('reports', () => reportsApi.list());
  const reports = data?.reports ?? [];
  const navigate = useNavigate();

  const approvedCount = reports.filter((r: Record<string, unknown>) => r.decision === 'approved').length;
  const blockedCount = reports.filter((r: Record<string, unknown>) => r.decision === 'blocked').length;
  const pendingCount = reports.filter((r: Record<string, unknown>) => !r.decision).length;

  return (
    <div className="animate-fade-in space-y-6 text-black">
      {/* Header */}
      <div className="pb-6 border-b border-black/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/5 text-zinc-800 border border-black/10 font-semibold">
            Audit & Compliance
          </span>
        </div>
        <h1 className="text-2xl font-bold text-black tracking-tight">API Migration & Sign-Off Reports</h1>
        <p className="text-xs text-zinc-600 mt-1">
          Formal sign-off records, release gates, and architectural risk assessments
        </p>
      </div>

      {/* Bento Metric Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bento-card p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
            Total Reports
          </span>
          <p className="text-2xl font-bold font-mono text-black mt-1">{reports.length}</p>
          <span className="text-[11px] text-zinc-600 mt-0.5 block">{pendingCount} pending architectural decisions</span>
        </div>
        <div className="bento-card p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
            Approved Releases
          </span>
          <p className="text-2xl font-bold font-mono text-black mt-1">{approvedCount}</p>
          <span className="text-[11px] text-zinc-600 mt-0.5 block">Signed off for production deployment</span>
        </div>
        <div className="bento-card p-4">
          <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
            Blocked Releases
          </span>
          <p className="text-2xl font-bold font-mono text-zinc-800 mt-1">{blockedCount}</p>
          <span className="text-[11px] text-zinc-600 mt-0.5 block">Breaking mutations or failing tests</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass-card p-12 text-center bg-white border border-black/10">
          <p className="text-sm font-semibold text-black mb-1">Failed to load reports</p>
          <p className="text-xs text-zinc-600">Could not reach the server. Try refreshing the page.</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-card p-12 text-center bg-white border border-black/10">
          <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-black mb-1">No sign-off reports recorded</p>
          <p className="text-xs text-zinc-600 max-w-sm mx-auto">
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
                className="bento-card p-5 cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {decision === 'approved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black text-white font-semibold text-[11px] font-mono border border-black">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>APPROVED FOR RELEASE</span>
                        </span>
                      ) : decision === 'blocked' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 text-black font-bold border border-black text-[11px] font-mono">
                          <AlertTriangle className="w-3.5 h-3.5 text-black" />
                          <span>BLOCKED PENDING FIXES</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-black/10 text-[11px] font-mono font-medium">
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
                        <span className="text-black font-bold">
                          {overview.breaking} Breaking
                        </span>
                        <span className="text-zinc-400">&bull;</span>
                        <span className="text-zinc-700 font-semibold">
                          {overview.warnings} Warnings
                        </span>
                        <span className="text-zinc-400">&bull;</span>
                        <span className="text-zinc-600">
                          {overview.affectedConsumers} Consumers Affected
                        </span>
                        {(overview.testRunsFailing as number) > 0 && (
                          <>
                            <span className="text-zinc-400">&bull;</span>
                            <span className="text-black font-bold">
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
                          <span>Authorized by <span className="text-black font-medium">{r.approved_by_email as string}</span></span>
                        </>
                      )}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-black transition-colors flex-shrink-0 mt-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
