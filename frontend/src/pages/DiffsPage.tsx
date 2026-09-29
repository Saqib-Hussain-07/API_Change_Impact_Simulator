import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { diffsApi, specsApi } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { GitCompare, Plus, Clock, ArrowRight, X, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export function DiffsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: diffsData, isLoading: diffsLoading } = useQuery('diffs', () => diffsApi.list());
  const { data: specsData } = useQuery('specs', () => specsApi.list());
  const diffs = diffsData?.diffs ?? [];
  const specs = specsData?.specs ?? [];

  const [showNew, setShowNew] = useState(false);
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [oldVersionId, setOldVersionId] = useState('');
  const [newVersionId, setNewVersionId] = useState('');

  const { data: versionsData } = useQuery(
    ['versions', selectedSpecId],
    () => specsApi.listVersions(selectedSpecId),
    { enabled: !!selectedSpecId },
  );
  const versions = versionsData?.versions ?? [];

  const createMutation = useMutation(
    () => diffsApi.create(oldVersionId, newVersionId),
    {
      onSuccess: (data: any) => {
        toast.success('Diff run completed!');
        qc.invalidateQueries('diffs');
        setShowNew(false);
        navigate(`/diffs/${data.diffRunId}`);
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
          'Diff analysis failed.';
        toast.error(msg);
      },
    },
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
              Diff Engine
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contract Diff Executions</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Pairwise structural comparison and breaking change classification
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowNew(true)} className="btn btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>New Diff Run</span>
          </button>
        )}
      </div>

      {/* New diff modal */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowNew(false)}
        >
          <div
            className="glass-card w-full max-w-lg p-6 bg-[#0c0c0e] border border-white/15 shadow-modal animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white tracking-tight">Compare Contract Snapshots</h2>
              <button onClick={() => setShowNew(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Select API Specification
                </label>
                <select
                  className="input text-xs font-mono"
                  value={selectedSpecId}
                  onChange={(e) => {
                    setSelectedSpecId(e.target.value);
                    setOldVersionId('');
                    setNewVersionId('');
                  }}
                >
                  <option value="">Choose specification...</option>
                  {specs.map((s: Record<string, string>) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedSpecId && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Baseline Version <span className="text-rose-400">*</span>
                      </label>
                      <select
                        className="input text-xs font-mono"
                        value={oldVersionId}
                        onChange={(e) => setOldVersionId(e.target.value)}
                      >
                        <option value="">Select baseline...</option>
                        {versions.map((v: Record<string, string>) => (
                          <option key={v.id} value={v.id} disabled={v.id === newVersionId}>
                            v{v.versionLabel}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Proposed Version <span className="text-rose-400">*</span>
                      </label>
                      <select
                        className="input text-xs font-mono"
                        value={newVersionId}
                        onChange={(e) => setNewVersionId(e.target.value)}
                      >
                        <option value="">Select proposed...</option>
                        {versions.map((v: Record<string, string>) => (
                          <option key={v.id} value={v.id} disabled={v.id === oldVersionId}>
                            v{v.versionLabel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {oldVersionId && newVersionId && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-950 border border-white/10 text-xs font-mono">
                      <span className="text-zinc-300 font-semibold">
                        v{versions.find((v: Record<string, string>) => v.id === oldVersionId)?.versionLabel}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-white font-bold">
                        v{versions.find((v: Record<string, string>) => v.id === newVersionId)?.versionLabel}
                      </span>
                      <span className="text-zinc-500 ml-auto">Ready to compare</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setShowNew(false)} className="btn btn-secondary flex-1 text-xs">
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!oldVersionId || !newVersionId || createMutation.isLoading}
                  className="btn btn-primary flex-1 text-xs"
                >
                  {createMutation.isLoading ? 'Computing Diff...' : 'Execute Diff Analysis'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diffs list */}
      {diffsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : diffs.length === 0 ? (
        <div className="glass-card p-12 text-center bg-[#09090b] border border-white/10">
          <GitCompare className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white mb-1">No diff executions recorded</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5">
            Compare two versions of an OpenAPI specification to classify breaking changes and affected consumers.
          </p>
          {isAdmin && (
            <button onClick={() => setShowNew(true)} className="btn btn-primary text-xs">
              Execute New Diff
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card bg-[#0b0b0d] border border-white/10 overflow-hidden divide-y divide-white/5">
          {diffs.map((d: Record<string, string>) => (
            <div
              key={d.id}
              onClick={() => navigate(`/diffs/${d.id}`)}
              className="p-4 px-5 flex items-center justify-between hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <DiffStatusIcon status={d.status} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-white tracking-tight truncate">
                      {d.spec_name ?? 'API Spec'}
                    </p>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
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
                    <span>{formatDate(d.run_at)}</span>
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
  );
}

function DiffStatusIcon({ status }: { status: string }) {
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
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso ?? '—';
  }
}
