import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuthStore, authActions } from '../store/auth.store';
import {
  LayoutDashboard, FileCode, GitCompare, Users, FileText,
  ClipboardList, LogOut, Shield, Globe
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/app/specs', icon: FileCode, label: 'API Specs' },
  { to: '/app/diffs', icon: GitCompare, label: 'Diff Runs' },
  { to: '/app/consumers', icon: Users, label: 'Consumers' },
  { to: '/app/reports', icon: FileText, label: 'Reports' },
  { to: '/app/audit', icon: ClipboardList, label: 'Audit Log', adminOnly: true },
];

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  function handleLogout() {
    authActions.logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white text-black">
      {/* ── Minimalist Sidebar ── */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#fbfbfb] border-r border-black/10">
        {/* Logo / Brand Header */}
        <div className="h-16 px-5 flex items-center border-b border-black/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold shadow-subtle flex-shrink-0">
              <BrandLogo className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-black tracking-tight uppercase">N Differ</span>
                <span className="font-mono text-[9px] px-1 py-0.2 bg-zinc-100 text-zinc-800 rounded border border-zinc-300 font-semibold">SIM</span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">v1.0.0-prod</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
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
                      ? 'bg-black text-white font-semibold shadow-subtle'
                      : 'text-zinc-600 hover:text-black hover:bg-black/[0.04]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white stroke-[2.2]' : 'text-zinc-500'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Account / Footer */}
        <div className="p-3 border-t border-black/10 bg-[#f8f8fa]">
          <div className="flex items-center gap-2.5 p-2 rounded-lg border border-black/10 bg-white mb-2 shadow-xs">
            <div className="w-7 h-7 rounded-md bg-zinc-100 border border-black/15 flex items-center justify-center text-xs font-semibold text-black flex-shrink-0 font-mono">
              {user?.email?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-black truncate">{user?.email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-2.5 h-2.5 text-zinc-500" />
                <span className="text-[10px] text-zinc-600 font-mono uppercase font-medium">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Link
              to="/landing"
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-black hover:bg-black/5 border border-black/10 transition-colors font-medium"
            >
              <Globe className="w-3 h-3 text-black" />
              <span>Overview</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-zinc-600 hover:text-black hover:bg-black/5 border border-transparent hover:border-black/10 transition-colors font-medium"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className="flex-1 overflow-y-auto bg-white bg-grid-subtle">
        <div className="max-w-6xl mx-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
