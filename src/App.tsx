import type { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Button, Result } from 'antd';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AppLayout from './layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MasterDataPage from './pages/MasterDataPage';
import VerificationsPage from './pages/VerificationsPage';
import UsersPage from './pages/UsersPage';
import ConnectionsPage from './pages/ConnectionsPage';
import { MANUAL_SELFIE_REVIEW } from './config/features';

function RequireAuth({ children }: { children: ReactNode }) {
  const { admin } = useAuth();
  const location = useLocation();
  if (!admin) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="verifications" element={MANUAL_SELFIE_REVIEW ? <VerificationsPage /> : <Navigate to="/" replace />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="connections" element={<ConnectionsPage />} />
          <Route path="master/:type" element={<MasterDataPage />} />
          <Route
            path="*"
            element={<Result status="404" title="Page not found" extra={<Button type="primary" href="/">Back to dashboard</Button>} />}
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
