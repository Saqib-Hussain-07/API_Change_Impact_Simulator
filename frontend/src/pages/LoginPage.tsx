import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { authActions } from '../store/auth.store';
import toast from 'react-hot-toast';
import { Terminal, ArrowRight, Eye, EyeOff, ShieldCheck, Users } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('admin@acme.dev');
  const [password, setPassword] = useState('Admin@1234');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      authActions.login(data.user, data.accessToken, data.refreshToken);
      toast.success(`Welcome back, ${data.user.email}!`);
      navigate('/app');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'Login failed. Please check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function pickAccount(role: 'admin' | 'mobile' | 'analytics') {
    if (role === 'admin') {
      setEmail('admin@acme.dev');
      setPassword('Admin@1234');
    } else if (role === 'mobile') {
      setEmail('mobile-rep@acme.dev');
      setPassword('Rep@1234');
    } else {
      setEmail('analytics-rep@acme.dev');
      setPassword('Rep@1234');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] bg-grid-subtle px-4 relative text-black">
      <div className="w-full max-w-sm">
        {/* Minimalist Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-black text-white mx-auto mb-4 flex items-center justify-center shadow-subtle">
            <Terminal className="w-5 h-5 stroke-[2.5]" />
          </div>
          <h1 className="text-xl font-bold text-black tracking-tight">API Impact Simulator</h1>
          <p className="text-xs text-zinc-600 mt-1">Autonomous breaking change detection & mock testing</p>
        </div>

        {/* Login Box */}
        <div className="bento-card bento-card-hero p-6 shadow-md bg-white border border-black/10">
          {/* Quick Demo Switcher */}
          <div className="mb-5 p-2.5 rounded-lg bg-zinc-50 border border-black/10">
            <p className="text-[10px] uppercase font-mono text-zinc-600 mb-2 font-bold tracking-wider">
              Quick Select Demo Persona:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => pickAccount('admin')}
                className={`px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors flex items-center gap-1.5 ${
                  email === 'admin@acme.dev'
                    ? 'bg-black text-white border-black font-semibold shadow-xs'
                    : 'bg-white text-zinc-700 border-black/15 hover:border-black/30'
                }`}
              >
                <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                <span>Admin (API Owner)</span>
              </button>

              <button
                type="button"
                onClick={() => pickAccount('mobile')}
                className={`px-2.5 py-1.5 rounded text-[11px] font-medium border transition-colors flex items-center gap-1.5 ${
                  email === 'mobile-rep@acme.dev'
                    ? 'bg-black text-white border-black font-semibold shadow-xs'
                    : 'bg-white text-zinc-700 border-black/15 hover:border-black/30'
                }`}
              >
                <Users className="w-3 h-3 flex-shrink-0" />
                <span>Mobile Rep</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">Work Email</label>
              <input
                type="email"
                required
                className="input font-mono text-xs"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@acme.dev"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-800 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  className="input font-mono text-xs pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-black"
                >
                  {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 mt-2 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign in to Console'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-zinc-500 font-mono space-y-2">
          <div>
            <Link to="/" className="text-zinc-600 hover:text-black transition-colors inline-flex items-center gap-1 font-medium">
              <span>&larr; Back to Product Overview</span>
            </Link>
          </div>
          <div>
            <span>Protected by JWT & RBAC &bull; Port 4000</span>
          </div>
        </div>
      </div>
    </div>
  );
}
