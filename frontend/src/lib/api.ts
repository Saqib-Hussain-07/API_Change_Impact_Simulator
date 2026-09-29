import axios from 'axios';
import { authActions } from '../store/auth.store';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = authActions.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const saved = JSON.parse(localStorage.getItem('api-impact-auth') ?? '{}');
        if (saved.refreshToken) {
          const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
            refreshToken: saved.refreshToken,
          });
          authActions.setAccessToken(data.accessToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        }
      } catch {
        authActions.logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// ── API helper functions ──────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (email: string, password: string, role: string, teamId?: string) =>
    api.post('/auth/register', { email, password, role, teamId }).then((r) => r.data),
};

export const specsApi = {
  list: (page = 1, limit = 20) => api.get('/specs', { params: { page, limit } }).then((r) => r.data),
  create: (name: string, description?: string) => api.post('/specs', { name, description }).then((r) => r.data),
  get: (specId: string) => api.get(`/specs/${specId}`).then((r) => r.data),
  listVersions: (specId: string) => api.get(`/specs/${specId}/versions`).then((r) => r.data),
  uploadVersion: (specId: string, formData: FormData) =>
    api.post(`/specs/${specId}/versions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),
};

export const diffsApi = {
  list: () => api.get('/diffs').then((r) => r.data),
  create: (oldVersionId: string, newVersionId: string, force = false) =>
    api.post('/diffs', { oldVersionId, newVersionId, force }).then((r) => r.data),
  get: (diffId: string) => api.get(`/diffs/${diffId}`).then((r) => r.data),
  triggerMockRun: (diffId: string) => api.post(`/diffs/${diffId}/mock-run`).then((r) => r.data),
  getReport: (diffId: string) => api.get(`/diffs/${diffId}/report`).then((r) => r.data),
  acknowledge: (diffId: string, impactId: string, action: string, reason?: string) =>
    api.post(`/diffs/${diffId}/acknowledge`, { impactId, action, reason }).then((r) => r.data),
};

export const consumersApi = {
  list: () => api.get('/consumers').then((r) => r.data),
  create: (name: string) => api.post('/consumers', { name }).then((r) => r.data),
  listDeps: (consumerId: string) => api.get(`/consumers/${consumerId}/dependencies`).then((r) => r.data),
  addDep: (consumerId: string, endpointPath: string, httpMethod: string, fieldPath?: string) =>
    api.post(`/consumers/${consumerId}/dependencies`, { endpointPath, httpMethod, fieldPath }).then((r) => r.data),
};

export const reportsApi = {
  list: () => api.get('/reports').then((r) => r.data),
  get: (diffId: string) => api.get(`/reports/${diffId}`).then((r) => r.data),
  signOff: (diffId: string, decision: 'approved' | 'blocked') =>
    api.post(`/reports/${diffId}/sign-off`, { decision }).then((r) => r.data),
  auditLog: (page = 1) => api.get('/reports/audit/log', { params: { page } }).then((r) => r.data),
};
