import { useQuery } from 'react-query';
import { diffsApi, reportsApi, specsApi, consumersApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import {
  GitCompare, Users, FileCode,
  Activity, ArrowRight, Clock, Plus, Upload, CheckCircle2, AlertTriangle, AlertCircle,
  ShieldCheck, Terminal, Layers
} from 'lucide-react';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const { data: diffsData, isLoading: diffsLoading } = useQuery('diffs', () => diffsApi.list());
  const { data: specsData } = useQuery('specs', () => specsApi.list());
  const { data: consumersData } = useQuery('consumers', () => consumersApi.list());
  const { data: reportsData } = useQuery('reports', () => reportsApi.list());

  const diffs = diffsData?.diffs ?? [];
  const specs = specsData?.specs ?? [];
  const consumers = consumersData?.teams ?? [];
  const reports = reportsData?.reports ?? [];

  const recentDiffs = diffs.slice(0, 5);

  // Compute summary stats for Bento cards
  const approvedCount = reports.filter((r: Record<string, unknown>) => r.decision === 'approved').length;
  const blockedCount = reports.filter((r: Record<string, unknown>) => r.decision === 'blocked').length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
              Console
            </span>
            <span className="text-xs text-zinc-500 font-mono">
              Signed in as <span className="text-zinc-300">{user?.email}</span>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">API Impact Simulation</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Deterministic contract diffing and downstream consumer blast-radius simulator
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

      {/* ── Bento Grid Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        
        {/* Bento Cell 1: Hero Simulation Engine Tile (Spans 2 cols & 2 rows on large) */}
        <div className="bento-card bento-card-hero md:col-span-2 lg:col-span-2 p-6 flex flex-col justify-between relative group">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                  Simulation Pipeline Engine
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-500 px-2 py-0.5 rounded bg-black/50 border border-white/10">
                v1.0.0-deterministic
              </span>
            </div>

            <h2 className="text-lg font-semibold text-white tracking-tight mb-2">
              Automated Breaking Change & Blast Radius Analysis
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
              Detects structural schema breaking mutations across query, path, and body parameters, cross-referenced with registered client teams before production deployment.
            </p>

            {/* Pipeline Step Visualizer */}
            <div className="grid grid-cols-3 gap-2 mt-6 p-3 rounded-xl bg-black/60 border border-white/5 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-white/5">
                <span className="text-[9px] text-zinc-500 block">STEP 01</span>
                <span className="text-white font-medium flex items-center gap-1.5 mt-1">
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" /> Ingestion
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-white/5">
                <span className="text-[9px] text-zinc-500 block">STEP 02</span>
                <span className="text-white font-medium flex items-center gap-1.5 mt-1">
                  <GitCompare className="w-3.5 h-3.5 text-zinc-400" /> Diff Matrix
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-white/5">
                <span className="text-[9px] text-zinc-500 block">STEP 03</span>
                <span className="text-white font-medium flex items-center gap-1.5 mt-1">
                  <Users className="w-3.5 h-3.5 text-zinc-400" /> Blast Radius
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
              <span>{diffs.length} diff runs recorded</span>
              <span>&bull;</span>
              <span>{specs.length} specs live</span>
            </div>
            <button
              onClick={() => navigate('/diffs')}
              className="text-xs font-mono text-white flex items-center gap-1.5 hover:underline group-hover:translate-x-0.5 transition-transform"
            >
              <span>Explore diff executions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bento Cell 2: Contract Specifications Vault */}
        <div
          onClick={() => navigate('/specs')}
          className="bento-card p-5 cursor-pointer hover:border-white/20 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Spec Repository
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300">
              <FileCode className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-3">
            <p className="text-3xl font-bold font-mono tracking-tight text-white">{specs.length}</p>
            <p className="text-xs text-zinc-400 mt-1">OpenAPI 3.x contracts</p>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Semantic versioning</span>
            <ArrowRight className="w-3 h-3 text-zinc-400" />
          </div>
        </div>

        {/* Bento Cell 3: Downstream Consumer Teams */}
        <div
          onClick={() => navigate('/consumers')}
          className="bento-card p-5 cursor-pointer hover:border-white/20 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Consumer Graph
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-3">
            <p className="text-3xl font-bold font-mono tracking-tight text-white">{consumers.length}</p>
            <p className="text-xs text-zinc-400 mt-1">Downstream client teams</p>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Dependency mapping</span>
            <ArrowRight className="w-3 h-3 text-zinc-400" />
          </div>
        </div>

        {/* Bento Cell 4: Release Sign-Off Gate Status */}
        <div
          onClick={() => navigate('/reports')}
          className="bento-card p-5 cursor-pointer hover:border-white/20 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Governance & Gate
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-3">
            <p className="text-3xl font-bold font-mono tracking-tight text-white">{reports.length}</p>
            <div className="flex items-center gap-3 text-xs font-mono mt-1">
              <span className="text-emerald-400">{approvedCount} approved</span>
              <span className="text-zinc-600">&bull;</span>
              <span className="text-rose-400">{blockedCount} blocked</span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Architectural sign-off</span>
            <ArrowRight className="w-3 h-3 text-zinc-400" />
          </div>
        </div>

        {/* Bento Cell 5: Automated Mock Simulation Telemetry */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Mock Simulation
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-300">
              <Terminal className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <p className="text-sm font-semibold text-white font-mono">Prism + Newman</p>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Sandboxed ephemeral port execution for contract verification
            </p>
          </div>

          <div className="pt-3 border-t border-white/5 text-[11px] font-mono text-zinc-500 flex items-center justify-between">
            <span>Isolated runs</span>
            <span className="text-emerald-400 font-semibold">Active</span>
          </div>
        </div>

        {/* Bento Cell 6: Recent Executions Feed (Spans 3 cols or 4 cols) */}
        <div className="bento-card md:col-span-3 lg:col-span-4 overflow-hidden">
          <div className="p-4 px-5 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-white" />
              <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                Recent Contract Diff Runs
              </h2>
            </div>
            <button
              onClick={() => navigate('/diffs')}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono transition-colors"
            >
              <span>view all ({diffs.length})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {diffsLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-12 rounded-lg" />
              ))}
            </div>
          ) : recentDiffs.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                <GitCompare className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-white mb-1">No diff executions recorded yet</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-4">
                Execute a comparison between two OpenAPI contract versions to classify breaking mutations.
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
                  className="flex items-center justify-between p-4 px-5 hover:bg-white/[0.025] transition-colors cursor-pointer group"
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

        {/* Bento Cell 7: Architectural Core Feature 01 */}
        <div
          onClick={() => navigate('/specs')}
          className="bento-card p-5 cursor-pointer hover:border-white/20 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
              Module 01
            </span>
            <FileCode className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white mb-1">Contract Normalization</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Validates OpenAPI 3.x schema structures, resolving models and array items.
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500">
            OpenAPI Parser &bull; Schema Hash
          </div>
        </div>

        {/* Bento Cell 8: Architectural Core Feature 02 */}
        <div
          onClick={() => navigate('/diffs')}
          className="bento-card p-5 cursor-pointer hover:border-white/20 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
              Module 02
            </span>
            <GitCompare className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white mb-1">Pairwise Diff Engine</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Rule-based breaking change classification without shell dependencies.
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500">
            Deterministic &bull; Fast Evaluation
          </div>
        </div>

        {/* Bento Cell 9: Architectural Core Feature 03 */}
        <div
          onClick={() => navigate('/consumers')}
          className="bento-card p-5 cursor-pointer hover:border-white/20 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
              Module 03
            </span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white mb-1">Consumer Blast Radius</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Maps mutated endpoints to client dependencies and automated test suites.
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500">
            Newman Tests &bull; Team Ownership
          </div>
        </div>

        {/* Bento Cell 10: Architectural Core Feature 04 */}
        <div
          onClick={() => navigate('/audit')}
          className="bento-card p-5 cursor-pointer hover:border-white/20 transition-all flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase text-zinc-500 font-semibold tracking-wider">
              Module 04
            </span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white mb-1">Governance & Audit</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Cryptographic event timeline recording spec ingestion, runs, and sign-offs.
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-white/5 text-[10px] font-mono text-zinc-500">
            Append-Only &bull; Security Log
          </div>
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
