import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, session, setSessionExpiredHandler, type Admin } from '../api/client';

interface AuthState {
  admin: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(() => session.get()?.admin ?? null);
  const navigate = useNavigate();

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setAdmin(null);
      navigate('/login', { replace: true, state: { expired: true } });
    });
  }, [navigate]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ accessToken: string; refreshToken: string; admin: Admin }>('/admin/auth/login', { email, password });
    session.set({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken, admin: res.data.admin });
    setAdmin(res.data.admin);
  }, []);

  const logout = useCallback(async () => {
    const s = session.get();
    if (s?.refreshToken) await api.post('/admin/auth/logout', { refreshToken: s.refreshToken }).catch(() => undefined);
    session.clear();
    setAdmin(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo(() => ({ admin, login, logout }), [admin, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
