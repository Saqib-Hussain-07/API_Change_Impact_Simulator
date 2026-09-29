import { useQuery } from 'react-query';
import { diffsApi, reportsApi, specsApi, consumersApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import {
  GitCompare, Users, FileCode,
  Activity, ArrowRight, Clock, Plus, Upload, CheckCircle2, AlertTriangle, AlertCircle
} from 'lucide-react';

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="glass-card p-5 bg-[#0b0b0d] border border-white/10 hover:border-white/20 transition-all">
      <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-2 font-medium">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold text-white tracking-tight font-mono">{value}</p>
        {sub && <span className="text-xs text-zinc-500 font-mono">{sub}</span>}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: diffsData } = useQuery('diffs', () => diffsApi.list(), { suspense: false });
  const { data: specsData } = useQuery('specs', () => specsApi.list(), { suspense: false });
  const { data: consumersData } = useQuery('consumers', () => consumersApi.list(), { suspense: false });
  const { data: reportsData } = useQuery('reports', () => reportsApi.list(), { suspense: false });

  const diffs = diffsData?.diffs ?? [];
  const specs = specsData?.specs ?? [];
  const consumers = consumersData?.teams ?? [];
  const reports = reportsData?.reports ?? [];

  const recentDiffs = diffs.slice(0, 6);

  return (
    <div className="animate-fade-in space-y-8">
      {/* ── Header & Action Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
              Overview
            </span>
            <span className="text-xs text-zinc-500 font-mono">Logged in as {user?.email}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">API Change Impact Console</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Structural OpenAPI diff engine & downstream consumer blast-radius simulation
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/specs')}
            className="btn btn-secondary text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Spec</span>
          </button>
          <button
            onClick={() => navigate('/diffs')}
            className="btn btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Diff Run</span>
          </button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Registered Specs" value={specs.length} sub="contracts" />
        <StatCard label="Total Diff Runs" value={diffs.length} sub="analyzed" />
        <StatCard label="Consumer Teams" value={consumers.length} sub="indexed" />
        <StatCard label="Impact Reports" value={reports.length} sub="generated" />
      </div>

      {/* ── Recent Diff Runs ── */}
      <div className="glass-card bg-[#0b0b0d] border border-white/10 overflow-hidden">
        <div className="p-4 px-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-white" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">Recent Diff Executions</h2>
          </div>
          <button
            onClick={() => navigate('/diffs')}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
          >
            <span>view all ({diffs.length})</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {recentDiffs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-3 text-zinc-500">
              <GitCompare className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-white mb-1">No diff executions recorded yet</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
              Select two versions of an API specification to detect breaking schema mutations and simulate consumer impact.
            </p>
            <button onClick={() => navigate('/diffs')} className="btn btn-primary text-xs">
              Execute First Diff
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentDiffs.map((d: Record<string, string>) => (
              <div
                key={d.id}
                onClick={() => navigate(`/diffs/${d.id}`)}
                className="flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <StatusIcon status={d.status as string} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white tracking-tight truncate">
                        {d.spec_name ?? 'API Spec'}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300">
                          {d.old_label}
                        </span>
                        <span className="text-zinc-600">&rarr;</span>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-white font-semibold">
                          {d.new_label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(d.run_at as string)}</span>
                      <span>&bull;</span>
                      <span className="uppercase">{d.status}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-zinc-500 group-hover:text-white transition-colors">
                  <span className="text-xs font-mono hidden sm:inline">Inspect &rarr;</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Platform Architectural Capabilities ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          onClick={() => navigate('/specs')}
          className="glass-card p-4 bg-[#0a0a0c] border border-white/10 hover:border-white/20 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">Module 01</span>
            <FileCode className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xs font-semibold text-white mb-1">OpenAPI 3.x Ingestion</h3>
          <p className="text-[11px] text-zinc-400">
            Immutable JSON/YAML contract versioning with automatic structural hash validation.
          </p>
        </div>

        <div
          onClick={() => navigate('/diffs')}
          className="glass-card p-4 bg-[#0a0a0c] border border-white/10 hover:border-white/20 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">Module 02</span>
            <GitCompare className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xs font-semibold text-white mb-1">Deterministic Differ</h3>
          <p className="text-[11px] text-zinc-400">
            Classifies removals, type changes, enums, and required fields into Breaking, Warning, or Safe.
          </p>
        </div>

        <div
          onClick={() => navigate('/consumers')}
          className="glass-card p-4 bg-[#0a0a0c] border border-white/10 hover:border-white/20 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">Module 03</span>
            <Users className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xs font-semibold text-white mb-1">Consumer Impact Simulator</h3>
          <p className="text-[11px] text-zinc-400">
            Prism mock server + Newman test execution against downstream team dependency graphs.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') {
    return (
      <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      </div>
    );
  }
  if (status === 'running') {
    return (
      <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0 animate-pulse">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-md bg-zinc-800 border border-white/10 flex items-center justify-center flex-shrink-0">
      <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso ?? '—';
  }
}
