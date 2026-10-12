import * as SecureStore from 'expo-secure-store';
import { AuthUser } from './auth';

export type StoredAuthSession = { token: string; user: AuthUser; expiresAt: string };
const SESSION_KEY = 'cleancheck.auth.session';

function isStoredAuthSession(value: unknown): value is StoredAuthSession {
  if (!value || typeof value !== 'object') return false;
  const token = Reflect.get(value, 'token');
  const expiresAt = Reflect.get(value, 'expiresAt');
  const user = Reflect.get(value, 'user');
  return typeof token === 'string' && token.length > 0
    && typeof expiresAt === 'string' && !Number.isNaN(Date.parse(expiresAt))
    && !!user && typeof user === 'object'
    && ['string', 'number'].includes(typeof Reflect.get(user, 'id'))
    && typeof Reflect.get(user, 'name') === 'string'
    && typeof Reflect.get(user, 'email') === 'string'
    && typeof Reflect.get(user, 'role') === 'string';
}

export async function saveAuthSession(session: StoredAuthSession): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
}

export async function readAuthSession(): Promise<StoredAuthSession | null> {
  const stored = await SecureStore.getItemAsync(SESSION_KEY);
  if (!stored) return null;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (isStoredAuthSession(parsed)) return parsed;
  } catch {
    // Conteúdo inválido é removido abaixo para não voltar a falhar no próximo arranque.
  }
  await removeAuthSession();
  return null;
}

export async function removeAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
