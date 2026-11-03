import { apiUrl, AuthError } from './auth';
import { fetchWithTimeout, HttpClientError } from './httpClient';

export type Profile = {
  id: number | string;
  name: string;
  email: string;
  phone: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  photo_url: string | null;
  is_active: boolean;
};

type AuthenticatedFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== 'object') return false;

  const id = Reflect.get(value, 'id');

  return (
    (typeof id === 'number' || typeof id === 'string') &&
    typeof Reflect.get(value, 'name') === 'string' &&
    typeof Reflect.get(value, 'email') === 'string' &&
    typeof Reflect.get(value, 'phone') === 'string' &&
    isNullableString(Reflect.get(value, 'address')) &&
    isNullableString(Reflect.get(value, 'postal_code')) &&
    isNullableString(Reflect.get(value, 'city')) &&
    isNullableString(Reflect.get(value, 'photo_url')) &&
    typeof Reflect.get(value, 'is_active') === 'boolean'
  );
}

/**
 * Reads the authenticated provider's profile. The identity always comes from
 * the session token; the API accepts no id, so it only returns the own profile.
 */
export async function getProfile(authenticatedFetch: AuthenticatedFetch): Promise<Profile> {
  let response: Response;

  try {
    response = await fetchWithTimeout(apiUrl('/profile'), {}, authenticatedFetch);
  } catch (error) {
    if (error instanceof AuthError) throw error;

    throw new AuthError(
      'NETWORK',
      error instanceof HttpClientError && error.code === 'TIMEOUT'
        ? 'Tempo limite excedido. Verifica a API e a rede.'
        : 'Não foi possível contactar a API. Tenta novamente.',
    );
  }

  if (response.status === 404) {
    throw new AuthError('FORBIDDEN', 'Esta conta não tem perfil de prestador.');
  }

  if (!response.ok) {
    throw new AuthError('SERVER', 'Não foi possível carregar o perfil.');
  }

  const payload: unknown = await response.json().catch(() => null);
  const data: unknown = payload && typeof payload === 'object' ? Reflect.get(payload, 'data') : null;

  if (!isProfile(data)) {
    throw new AuthError('INVALID_RESPONSE', 'Os dados do perfil não têm o formato esperado.');
  }

  return data;
}
