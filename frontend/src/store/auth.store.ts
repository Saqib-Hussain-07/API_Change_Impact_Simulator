
// Inline zustand to avoid adding another dep — we use a simple store pattern
// Note: Zustand is not in package.json, so we use a simple React-context alternative

interface User {
  id: string;
  email: string;
  role: 'admin' | 'consumer_rep' | 'reviewer';
  teamId?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
}

// Simple localStorage-backed store without zustand (to avoid extra dep)
const STORAGE_KEY = 'api-impact-auth';

function loadFromStorage(): Partial<AuthState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function createStore() {
  const saved = loadFromStorage();
  let state: AuthState = {
    user: (saved as AuthState).user ?? null,
    accessToken: (saved as AuthState).accessToken ?? null,
    refreshToken: (saved as AuthState).refreshToken ?? null,
    isAuthenticated: !!(saved as AuthState).accessToken,
    login(user, accessToken, refreshToken) {
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, accessToken, refreshToken }));
      listeners.forEach((l) => l());
    },
    logout() {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem(STORAGE_KEY);
      listeners.forEach((l) => l());
    },
    setAccessToken(token) {
      state.accessToken = token;
      const saved2 = loadFromStorage();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved2, accessToken: token }));
    },
  };
  const listeners = new Set<() => void>();
  return { getState: () => state, subscribe: (l: () => void) => { listeners.add(l); return () => listeners.delete(l); } };
}

const store = createStore();

import { useSyncExternalStore } from 'react';

export function useAuthStore<T>(selector: (s: AuthState) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(store.getState()));
}

export const authActions = {
  login: (user: AuthState['user'], at: string, rt: string) => store.getState().login(user!, at, rt),
  logout: () => store.getState().logout(),
  setAccessToken: (t: string) => store.getState().setAccessToken(t),
  getAccessToken: () => store.getState().accessToken,
};
