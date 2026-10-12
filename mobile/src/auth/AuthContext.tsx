import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { AuthError, AuthUser, login, LoginCredentials } from '../services/auth';

type AuthSession = { token: string; user: AuthUser; expiresAt: string };
type AuthContextValue = { session: AuthSession | null; signIn: (credentials: LoginCredentials) => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);

  async function signIn(credentials: LoginCredentials) {
    const response = await login(credentials);
    if (Date.parse(response.expires_at) <= Date.now()) throw new AuthError('SESSION_EXPIRED', 'A sessão recebida já expirou.');
    // O token permanece apenas no contexto em memória e nunca é renderizado. Persistência
    // e restauro só serão ativados com uma implementação de armazenamento seguro aprovada.
    setSession({ token: response.token, user: response.user, expiresAt: response.expires_at });
  }

  const value = useMemo(() => ({ session, signIn }), [session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
