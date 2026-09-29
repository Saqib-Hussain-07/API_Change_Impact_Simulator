import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { diffsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import {
  ArrowLeft, AlertTriangle, CheckCircle2, Play,
  FileText, Users, ChevronDown, ChevronRight, Download, ShieldCheck, X
} from 'lucide-react';

type Classification = 'BREAKING' | 'WARNING' | 'NON_BREAKING';

interface Change {
  id: string;
  changeType: string;
  classification: Classification;
  endpointPath: string;
  httpMethod: string;
  fieldPath?: string;
  explanation: string;
  affectedConsumers: Array<{ teamName: string; severity: string }>;
}

const classConfig: Record<
  Classification,
  { label: string; dot: string; text: string; bg: string; border: string }
> = {
  BREAKING: {
    label: 'Breaking',
    dot: 'bg-rose-500',
    text: 'text-rose-300',
    bg: 'bg-[#150709]',
    border: 'border-rose-900/40',
  },
  WARNING: {
    label: 'Warning',
    dot: 'bg-amber-500',
    text: 'text-amber-300',
    bg: 'bg-[#151006]',
    border: 'border-amber-900/40',
  },
  NON_BREAKING: {
    label: 'Non-Breaking',
    dot: 'bg-emerald-500',
    text: 'text-emerald-300',
    bg: 'bg-[#06150c]',
    border: 'border-emerald-900/40',
  },
};

export function DiffDetailPage() {
  const { diffId } = useParams<{ diffId: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const { data, isLoading } = useQuery(['diff', diffId], () => diffsApi.get(diffId!), {
    refetchOnMount: true,
  });
  const [filter, setFilter] = useState<'ALL' | Classification>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mockLoading, setMockLoading] = useState(false);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-24 rounded-lg" />
        <div className="skeleton h-64 rounded-lg" />
      </div>
    );
  }

  const changes: Change[] = data?.changes ?? [];
  const breaking = changes.filter((c) => c.classification === 'BREAKING');
  const warnings = changes.filter((c) => c.classification === 'WARNING');
  const safe = changes.filter((c) => c.classification === 'NON_BREAKING');

  const filtered = filter === 'ALL' ? changes : changes.filter((c) => c.classification === filter);

  async function runMockTest() {
    setMockLoading(true);
    try {
      const result = await diffsApi.triggerMockRun(diffId!);
      toast.success(`Mock simulation complete — ${result.testRuns?.length ?? 0} suite(s) tested`);
      qc.invalidateQueries(['diff', diffId]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Mock simulation failed.';
      toast.error(msg);
    } finally {
      setMockLoading(false);
    }
  }

  async function loadReport() {
    setLoadingReport(true);
    try {
      const report = await diffsApi.getReport(diffId!);
      setReportData(report);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoadingReport(false);
    }
  }

  async function downloadCSV() {
    const url = `/api/v1/diffs/${diffId}/report?format=csv`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `impact-report-${diffId}.csv`;
    link.click();
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Top Navigation Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/diffs')}
            className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500 uppercase">Analysis ID:</span>
              <span className="font-mono text-xs text-white font-medium">{diffId?.slice(0, 8)}</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Contract Diff & Impact Report</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <button
              onClick={runMockTest}
              disabled={mockLoading}
              className="btn btn-primary text-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{mockLoading ? 'Simulating...' : 'Run Mock Tests'}</span>
            </button>
          )}
          <button
            onClick={loadReport}
            disabled={loadingReport}
            className="btn btn-secondary text-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Checklist</span>
          </button>
          <button onClick={downloadCSV} className="btn btn-secondary text-xs">
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        {(
          [
            ['BREAKING', breaking.length],
            ['WARNING', warnings.length],
            ['NON_BREAKING', safe.length],
          ] as [Classification, number][]
        ).map(([cls, count]) => {
          const cfg = classConfig[cls];
          const isActive = filter === cls;
          return (
            <button
              key={cls}
              onClick={() => setFilter(filter === cls ? 'ALL' : cls)}
              className={`p-4 rounded-xl text-left transition-all border ${
                isActive
                  ? 'bg-zinc-900 border-white text-white shadow-subtle'
                  : 'bg-[#0c0c0e] border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-zinc-300">
                  {cfg.label}
                </span>
              </div>
              <p className="text-3xl font-bold font-mono tracking-tight text-white">{count}</p>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                {isActive ? 'Showing filtered' : 'Click to filter'}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Report Drawer ── */}
      {reportData && (
        <ReportPanel
          report={reportData}
          diffId={diffId!}
          isAdmin={isAdmin}
          onClose={() => setReportData(null)}
        />
      )}

      {/* ── Filter Bar ── */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-white/10">
          {(['ALL', 'BREAKING', 'WARNING', 'NON_BREAKING'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-2.5 py-1 rounded font-mono transition-all ${
                filter === f
                  ? 'bg-white text-black font-semibold shadow-subtle'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'All' : classConfig[f].label}
              <span className="ml-1 opacity-70">
                ({f === 'ALL' ? changes.length : changes.filter((c) => c.classification === f).length})
              </span>
            </button>
          ))}
        </div>

        <span className="text-xs text-zinc-500 font-mono">
          Showing {filtered.length} of {changes.length} change items
        </span>
      </div>

      {/* ── Changes List ── */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="glass-card p-10 text-center bg-[#09090b] border border-white/10">
            <CheckCircle2 className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-400 font-mono">No change mutations in this classification category</p>
          </div>
        ) : (
          filtered.map((change) => {
            const cfg = classConfig[change.classification];
            const isOpen = expanded === change.id;
            return (
              <div
                key={change.id}
                className="glass-card bg-[#0b0b0d] border border-white/10 overflow-hidden transition-all"
              >
                <div
                  className="w-full flex items-start justify-between gap-3 p-4 cursor-pointer hover:bg-white/[0.02]"
                  onClick={() => setExpanded(isOpen ? null : change.id)}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`badge-method badge-method-${change.httpMethod?.toLowerCase()}`}>
                          {change.httpMethod?.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono font-semibold text-white">
                          {change.endpointPath}
                        </span>
                        {change.fieldPath && (
                          <span className="code-inline text-[11px] text-zinc-300">
                            {change.fieldPath}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${cfg.bg} ${cfg.border} ${cfg.text} font-semibold`}
                        >
                          {change.changeType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">{change.explanation}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 mt-0.5">
                    {change.affectedConsumers.length > 0 && (
                      <span className="text-[11px] font-mono text-rose-400 bg-rose-950/30 border border-rose-900/40 px-2 py-0.5 rounded flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        <span>{change.affectedConsumers.length} affected</span>
                      </span>
                    )}
                    <button className="text-zinc-500 hover:text-white">
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Consumer Breakdown */}
                {isOpen && change.affectedConsumers.length > 0 && (
                  <div className="px-4 py-3 bg-black/40 border-t border-white/5 space-y-2">
                    <p className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider font-semibold">
                      Downstream Affected Consumers
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {change.affectedConsumers.map((ac, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded bg-zinc-950 border border-white/10 text-xs font-mono"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            <span className="text-white font-medium">{ac.teamName}</span>
                          </div>
                          <span className="text-[10px] uppercase font-bold text-rose-300 px-1.5 py-0.5 rounded bg-rose-950/50 border border-rose-900/30">
                            {ac.severity} severity
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ReportPanel({
  report,
  diffId,
  isAdmin,
  onClose,
}: {
  report: Record<string, unknown>;
  diffId: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const [signOffLoading, setSignOffLoading] = useState(false);
  const overview = report.overview as Record<string, number> | undefined;
  const recs = (report.recommendations as string[]) ?? [];

  async function signOff(decision: 'approved' | 'blocked') {
    setSignOffLoading(true);
    try {
      const { reportsApi } = await import('../lib/api');
      await reportsApi.signOff(diffId, decision);
      toast.success(`Deployment release decision recorded: ${decision.toUpperCase()}`);
      onClose();
    } catch {
      toast.error('Sign-off operation failed');
    } finally {
      setSignOffLoading(false);
    }
  }

  return (
    <div className="glass-card p-6 bg-[#0a0a0c] border border-white/15 shadow-elevated animate-slide-up space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-white" />
          <h2 className="text-sm font-semibold text-white tracking-tight">API Release Migration Checklist</h2>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg bg-zinc-950 border border-white/10">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Breaking</span>
            <p className="text-xl font-bold font-mono text-rose-400 mt-0.5">{overview.breaking}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950 border border-white/10">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Warnings</span>
            <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">{overview.warnings}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950 border border-white/10">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Non-Breaking</span>
            <p className="text-xl font-bold font-mono text-emerald-400 mt-0.5">{overview.nonBreaking}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950 border border-white/10">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Affected Teams</span>
            <p className="text-xl font-bold font-mono text-white mt-0.5">{overview.affectedConsumers}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-mono uppercase text-zinc-400 tracking-wider font-semibold">
          Architectural Action Items & Recommendations:
        </p>
        {recs.map((r, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-zinc-950 border border-white/10 text-xs text-zinc-300 font-mono leading-relaxed"
          >
            {r}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="flex gap-2.5 pt-3 border-t border-white/10">
          <button
            onClick={() => signOff('approved')}
            disabled={signOffLoading}
            className="btn btn-primary flex-1 text-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Authorize & Approve Release</span>
          </button>
          <button
            onClick={() => signOff('blocked')}
            disabled={signOffLoading}
            className="btn btn-danger flex-1 text-xs"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Block Release Pending Fixes</span>
          </button>
        </div>
      )}
    </div>
  );
}
