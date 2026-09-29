import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore, authActions } from '../store/auth.store';
import {
  LayoutDashboard, FileCode, GitCompare, Users, FileText,
  ClipboardList, LogOut, Terminal, Shield
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/specs', icon: FileCode, label: 'API Specs' },
  { to: '/diffs', icon: GitCompare, label: 'Diff Runs' },
  { to: '/consumers', icon: Users, label: 'Consumers' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/audit', icon: ClipboardList, label: 'Audit Log', adminOnly: true },
];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  function handleLogout() {
    authActions.logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      {/* ── Minimalist Sidebar ── */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#050507] border-r border-white/10">
        {/* Logo / Brand Header */}
        <div className="h-16 px-5 flex items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-bold shadow-subtle flex-shrink-0">
              <Terminal className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-white tracking-tight uppercase">API Impact</span>
                <span className="font-mono text-[9px] px-1 py-0.2 bg-white/10 text-zinc-300 rounded border border-white/15 font-semibold">SIM</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">v1.0.0-prod</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            Platform
          </div>
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-black font-semibold shadow-subtle'
                      : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-black stroke-[2.2]' : 'text-zinc-400'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Account / Footer */}
        <div className="p-3 border-t border-white/10 bg-[#08080a]">
          <div className="flex items-center gap-2.5 p-2 rounded-lg border border-white/10 bg-black/40 mb-2">
            <div className="w-7 h-7 rounded-md bg-zinc-800 border border-white/15 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0 font-mono">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-2.5 h-2.5 text-zinc-500" />
                <span className="text-[10px] text-zinc-400 font-mono uppercase">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className="flex-1 overflow-y-auto bg-black bg-grid-subtle">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
