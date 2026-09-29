import { useQuery } from 'react-query';
import { reportsApi } from '../lib/api';
import { ClipboardList, Clock, User, Terminal } from 'lucide-react';

export function AuditPage() {
  const { data, isLoading } = useQuery('audit', () => reportsApi.auditLog());
  const logs = data?.logs ?? [];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/10 text-zinc-300 border border-white/10">
            Security & Governance
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Audit & Event Stream</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Append-only cryptographic timeline of state mutations, authorizations, and spec ingestions
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="glass-card p-12 text-center bg-[#09090b] border border-white/10">
          <ClipboardList className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white mb-1">No audit events recorded</p>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Audit entries will record chronologically as users log in, upload specs, and authorize releases.
          </p>
        </div>
      ) : (
        <div className="glass-card bg-[#0b0b0d] border border-white/10 overflow-hidden divide-y divide-white/5 font-mono">
          {logs.map((log: Record<string, unknown>) => {
            const action = (log.action_type as string) ?? 'ACTION';
            return (
              <div
                key={log.id as string}
                className="flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-6 h-6 rounded bg-zinc-900 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-zinc-400">
                    <Terminal className="w-3 h-3" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-white px-1.5 py-0.5 rounded bg-zinc-900 border border-white/15">
                        {action}
                      </span>
                      {log.entity_type && (
                        <span className="text-xs text-zinc-400">
                          target: <span className="text-zinc-200">{String(log.entity_type)}</span>
                        </span>
                      )}
                      {log.entity_id && (
                        <span className="text-[11px] text-zinc-600">
                          [{String(log.entity_id).slice(0, 8)}]
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">
                      {log.user_email && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="text-zinc-400">{String(log.user_email)}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.timestamp as string).toLocaleString()}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-zinc-600 uppercase flex-shrink-0">Recorded</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
