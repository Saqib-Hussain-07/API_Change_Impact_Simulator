import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { authActions } from '../store/auth.store';
import toast from 'react-hot-toast';
import Login03, { type DemoPersona } from '@/components/ui/login-03';

interface LoginPageProps {
  defaultMode?: 'signin' | 'signup';
}

export function LoginPage({ defaultMode = 'signin' }: LoginPageProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [email, setEmail] = useState(defaultMode === 'signin' ? 'admin@acme.dev' : '');
  const [password, setPassword] = useState(defaultMode === 'signin' ? 'Admin@1234' : '');
  const [role, setRole] = useState<'admin' | 'consumer_rep'>('consumer_rep');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleModeChange(nextMode: 'signin' | 'signup') {
    setMode(nextMode);
    if (nextMode === 'signup' && email === 'admin@acme.dev') {
      setEmail('');
      setPassword('');
    } else if (nextMode === 'signin' && !email) {
      setEmail('admin@acme.dev');
      setPassword('Admin@1234');
    }
  }

  function pickAccount(persona: DemoPersona) {
    if (persona === 'admin') {
      setEmail('admin@acme.dev');
      setPassword('Admin@1234');
    } else if (persona === 'mobile') {
      setEmail('mobile-rep@acme.dev');
      setPassword('Rep@1234');
    } else {
      setEmail('analytics-rep@acme.dev');
      setPassword('Rep@1234');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        const data = await authApi.login(email, password);
        authActions.login(data.user, data.accessToken, data.refreshToken);
        toast.success(`Welcome back, ${data.user.email}!`);
        navigate('/app');
      } else {
        await authApi.register(email, password, role);
        const data = await authApi.login(email, password);
        authActions.login(data.user, data.accessToken, data.refreshToken);
        toast.success(`Account created for ${data.user.email}!`);
        navigate('/app');
      }
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: { message?: string } } };
      };
      const apiMsg = axiosErr?.response?.data?.error?.message;
      const status = axiosErr?.response?.status;
      const msg =
        apiMsg ??
        (!axiosErr?.response || (status !== undefined && status >= 500)
          ? 'Cannot reach API server. Please make sure the backend is running.'
          : mode === 'signin'
            ? 'Login failed. Please check your credentials.'
            : 'Registration failed. Please check your details and try again.');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Login03
      mode={mode}
      onModeChange={handleModeChange}
      email={email}
      onEmailChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      role={role}
      onRoleChange={setRole}
      loading={loading}
      onSubmit={handleSubmit}
      onPickPersona={pickAccount}
    />
  );
}
