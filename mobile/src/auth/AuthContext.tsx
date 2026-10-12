import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthError, AuthUser, login, LoginCredentials, logout } from '../services/auth';
import { readAuthSession, removeAuthSession, saveAuthSession } from '../services/authTokenStorage';

type AuthSession = { token: string; user: AuthUser; expiresAt: string };
type AuthContextValue = {
  session: AuthSession | null;
  restoring: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  authenticatedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const stored = await readAuthSession();
        if (stored && Date.parse(stored.expiresAt) > Date.now()) {
          if (active) setSession(stored);
        } else if (stored) {
          await removeAuthSession();
        }
      } catch {
        // Uma falha do armazenamento não deve bloquear a abertura do ecrã de login.
        if (active) setSession(null);
      } finally {
        if (active) setRestoring(false);
      }
    }
    restore();
    return () => { active = false; };
  }, []);

  async function signIn(credentials: LoginCredentials) {
    const response = await login(credentials);
    if (Date.parse(response.expires_at) <= Date.now()) throw new AuthError('SESSION_EXPIRED', 'A sessão recebida já expirou.');
    const nextSession = { token: response.token, user: response.user, expiresAt: response.expires_at };
    await saveAuthSession(nextSession);
    setSession(nextSession);
  }

  const clearLocalSession = useCallback(async () => {
    try {
      await removeAuthSession();
    } catch {
      // O estado em memória é limpo mesmo se o armazenamento local falhar.
    } finally {
      setSession(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      if (session?.token) await logout(session.token);
    } catch {
      // O logout local é obrigatório mesmo quando a API ou a rede falham.
    } finally {
      await clearLocalSession();
    }
  }, [session, clearLocalSession]);

  const authenticatedFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    if (!session || Date.parse(session.expiresAt) <= Date.now()) {
      await clearLocalSession();
      throw new AuthError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
    }
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    headers.set('Authorization', `Bearer ${session.token}`);
    const response = await fetch(input, { ...init, headers });
    if (response.status === 401) await clearLocalSession();
    return response;
  }, [session, clearLocalSession]);

  const value = useMemo(() => ({ session, restoring, signIn, signOut, authenticatedFetch }), [session, restoring, signOut, authenticatedFetch]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
