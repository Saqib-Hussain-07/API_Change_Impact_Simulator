import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { LandingPageWrapped } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { SpecsPage } from './pages/SpecsPage';
import { DiffsPage } from './pages/DiffsPage';
import { DiffDetailPage } from './pages/DiffDetailPage';
import { ConsumersPage } from './pages/ConsumersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Landing & Auth */}
      <Route path="/" element={<LandingPageWrapped />} />
      <Route path="/landing" element={<LandingPageWrapped />} />
      <Route path="/login" element={<LoginPage key="signin" />} />
      <Route path="/signup" element={<LoginPage key="signup" defaultMode="signup" />} />

      {/* Authenticated Workspace */}
      <Route
        path="/app"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="specs" element={<SpecsPage />} />
        <Route path="diffs" element={<DiffsPage />} />
        <Route path="diffs/:diffId" element={<DiffDetailPage />} />
        <Route path="consumers" element={<ConsumersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit" element={<AuditPage />} />
      </Route>

      {/* Backward-compatibility redirects */}
      <Route path="/dashboard" element={<Navigate to="/app" replace />} />
      <Route path="/specs" element={<Navigate to="/app/specs" replace />} />
      <Route path="/diffs" element={<Navigate to="/app/diffs" replace />} />
      <Route path="/diffs/:diffId" element={<Navigate to="/app/diffs/:diffId" replace />} />
      <Route path="/consumers" element={<Navigate to="/app/consumers" replace />} />
      <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
      <Route path="/audit" element={<Navigate to="/app/audit" replace />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
