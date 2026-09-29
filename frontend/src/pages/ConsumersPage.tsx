import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { consumersApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import toast from 'react-hot-toast';
import { Users, Plus, Link2, ChevronDown, ChevronRight, X } from 'lucide-react';

export function ConsumersPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'admin';
  const qc = useQueryClient();

  const { data, isLoading } = useQuery('consumers', () => consumersApi.list());
  const teams = data?.teams ?? [];

  const [showCreate, setShowCreate] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showDepForm, setShowDepForm] = useState<string | null>(null);
  const [depPath, setDepPath] = useState('');
  const [depMethod, setDepMethod] = useState('GET');
  const [depField, setDepField] = useState('');

  const createMutation = useMutation(
    () => consumersApi.create(newTeamName),
    {
      onSuccess: () => {
        toast.success('Consumer team registered!');
        qc.invalidateQueries('consumers');
        setShowCreate(false);
        setNewTeamName('');
      },
      onError: () => {
        toast.error('Failed to create consumer team.');
      },
    },
  );

  const addDepMutation = useMutation(
    ({ teamId }: { teamId: string }) =>
      consumersApi.addDep(teamId, depPath, depMethod, depField || undefined),
    {
      onSuccess: () => {
        toast.success('Dependency registered successfully!');
        qc.invalidateQueries(['deps', showDepForm]);
        qc.invalidateQueries('consumers');
        setShowDepForm(null);
        setDepPath('');
        setDepMethod('GET');
        setDepField('');
      },
      onError: () => {
        toast.error('Failed to register dependency.');
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
              Registry
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Downstream Consumer Teams</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Index of service consumers, endpoint contracts, and field dependencies
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>New Team</span>
          </button>
        )}
      </div>

      {/* Create team modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="glass-card w-full max-w-md p-6 bg-[#0c0c0e] border border-white/15 shadow-modal animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white tracking-tight">Register Consumer Team</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Team Name <span className="text-rose-400">*</span>
                </label>
                <input
                  className="input text-xs"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Mobile iOS Client Team"
                  autoFocus
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button onClick={() => setShowCreate(false)} className="btn btn-secondary flex-1 text-xs">
                  Cancel
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={!newTeamName || createMutation.isLoading}
                  className="btn btn-primary flex-1 text-xs"
                >
                  {createMutation.isLoading ? 'Registering...' : 'Register Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teams list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="glass-card p-12 text-center bg-[#09090b] border border-white/10">
          <Users className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white mb-1">No consumer teams registered</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-5">
            Register teams that consume your APIs to track breaking change blast radiuses.
          </p>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)} className="btn btn-primary text-xs">
              Register Team
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map((team: Record<string, string | number>) => (
            <div key={team.id} className="glass-card bg-[#0b0b0d] border border-white/10 overflow-hidden">
              <div
                className="p-4 px-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(expanded === team.id ? null : (team.id as string))}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/15 flex items-center justify-center font-mono font-bold text-white text-xs flex-shrink-0">
                    {(team.name as string)[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-xs tracking-tight truncate">{team.name}</p>
                    <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                      {team.dependency_count ?? 0} contract dependencies registered
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDepForm(team.id as string);
                      setExpanded(team.id as string);
                    }}
                    className="btn btn-secondary text-xs py-1 px-2.5"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>Add Dependency</span>
                  </button>
                  <button className="text-zinc-500 hover:text-white transition-colors">
                    {expanded === team.id ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expanded === team.id && (
                <div className="border-t border-white/10 bg-black/40">
                  {/* Add dependency form */}
                  {showDepForm === team.id && (
                    <div className="p-5 border-b border-white/10 bg-zinc-950/70">
                      <div className="max-w-xl mx-auto space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-semibold text-white font-mono uppercase tracking-wider">
                            Declare Dependency for {team.name}
                          </h3>
                          <button onClick={() => setShowDepForm(null)} className="text-zinc-400 hover:text-white">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Method</label>
                            <select
                              className="input text-xs font-mono font-bold"
                              value={depMethod}
                              onChange={(e) => setDepMethod(e.target.value)}
                            >
                              {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                              Endpoint Path <span className="text-rose-400">*</span>
                            </label>
                            <input
                              className="input text-xs font-mono"
                              value={depPath}
                              onChange={(e) => setDepPath(e.target.value)}
                              placeholder="/users/{id}"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                            Specific Field Path <span className="text-zinc-500 font-normal">(optional)</span>
                          </label>
                          <input
                            className="input text-xs font-mono"
                            value={depField}
                            onChange={(e) => setDepField(e.target.value)}
                            placeholder="e.g. email or response.data.id"
                          />
                        </div>

                        <div className="flex gap-2.5">
                          <button onClick={() => setShowDepForm(null)} className="btn btn-secondary flex-1 text-xs">
                            Cancel
                          </button>
                          <button
                            onClick={() => addDepMutation.mutate({ teamId: team.id as string })}
                            disabled={!depPath || addDepMutation.isLoading}
                            className="btn btn-primary flex-1 text-xs"
                          >
                            {addDepMutation.isLoading ? 'Registering...' : 'Register Dependency'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <DependencyList teamId={team.id as string} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DependencyList({ teamId }: { teamId: string }) {
  const { data, isLoading } = useQuery(['deps', teamId], () => consumersApi.listDeps(teamId));
  const deps = data?.dependencies ?? [];

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="skeleton h-8 rounded" />
      </div>
    );
  }

  if (deps.length === 0) {
    return (
      <p className="text-xs text-zinc-500 p-4 font-mono">
        No specific endpoint dependencies declared yet.
      </p>
    );
  }

  return (
    <div className="divide-y divide-white/5 font-mono text-xs">
      {deps.map((d: Record<string, string>) => (
        <div key={d.id} className="px-5 py-2.5 flex items-center justify-between hover:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className={`badge-method badge-method-${d.http_method?.toLowerCase()}`}>
              {d.http_method}
            </span>
            <span className="text-white font-medium">{d.endpoint_path}</span>
            {d.field_path && (
              <span className="code-inline text-[11px] text-zinc-400">
                field: {d.field_path}
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-600 uppercase">Monitored</span>
        </div>
      ))}
    </div>
  );
}
