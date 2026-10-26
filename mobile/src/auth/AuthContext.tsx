import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthError, AuthUser, getCurrentUser, login, LoginCredentials, logout } from '../services/auth';
import { readAuthSession, removeAuthSession, saveAuthSession } from '../services/authTokenStorage';
import { Alert } from 'react-native';

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

      if (!active || !stored) return;

      if (Date.parse(stored.expiresAt) <= Date.now()) {
        await removeAuthSession();
        return;
      }

      // Confirma o token e recupera os dados atuais do utilizador.
      const user = await getCurrentUser(stored.token);

      if (!active) return;

      // O token pode ter expirado enquanto o pedido estava em curso.
      if (Date.parse(stored.expiresAt) <= Date.now()) {
        await removeAuthSession();
        return;
      }

      const verifiedSession = {
        ...stored,
        user,
      };

      await saveAuthSession(verifiedSession);

      if (active) {
        setSession(verifiedSession);
      }
    } catch (error) {
      if (!active) return;

      const invalidSession =
        error instanceof AuthError &&
        (error.code === 'SESSION_EXPIRED' || error.code === 'FORBIDDEN');

      let message =
        error instanceof Error
          ? error.message
          : 'Não foi possível recuperar a sessão.';

      if (invalidSession) {
        try {
          await removeAuthSession();
        } catch {
          message += ' Também não foi possível limpar a sessão guardada.';
        }
      }

      if (active) {
        setSession(null);

        Alert.alert(
          'Sessão',
          invalidSession
            ? message
            : `${message} Verifica a ligação e volta a abrir a aplicação para repetir a verificação.`,
        );
      }
    } finally {
      if (active) {
        setRestoring(false);
      }
    }
  }

  void restore();

  return () => {
    active = false;
  };
}, []);

  async function signIn(credentials: LoginCredentials) {
    const response = await login(credentials);
    if (Date.parse(response.expires_at) <= Date.now()) throw new AuthError('SESSION_EXPIRED', 'A sessão recebida já expirou.');
    const nextSession = { token: response.token, user: response.user, expiresAt: response.expires_at };
    await saveAuthSession(nextSession);
    setSession(nextSession);
  }

 const clearLocalSession = useCallback(async () => {
  // O estado é limpo mesmo se o armazenamento seguro não responder.
  // Assim, a navegação regressa sempre ao login durante o logout.
  try {
    await removeAuthSession();
  } finally {
    setSession(null);
  }
}, []);

  const signOut = useCallback(async () => {
  try {
    if (session?.token) {
      await logout(session.token);
    }
  } catch {
    // A saída local não depende da confirmação da API. O token pode ser
    // revogado mais tarde pela expiração, mas deixa de estar no dispositivo.
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
