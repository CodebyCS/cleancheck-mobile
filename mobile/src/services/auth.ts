export type LoginCredentials = { email: string; password: string; device_name?: string };
export type AuthUser = { id: number | string; name: string; email: string; role: string };
export type LoginResponse = { token: string; expires_at: string; user: AuthUser };
export type LoginFieldErrors = { email?: string; password?: string };
export type AuthErrorCode = 'VALIDATION' | 'RATE_LIMITED' | 'NETWORK' | 'SERVER' | 'CONFIGURATION' | 'INVALID_RESPONSE' | 'SESSION_EXPIRED';

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode, message: string, public readonly fieldErrors: LoginFieldErrors = {}) {
    super(message);
    this.name = 'AuthError';
  }
}

function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function getValidationErrors(payload: unknown): LoginFieldErrors {
  if (!payload || typeof payload !== 'object' || !('errors' in payload)) return {};
  const errors = payload.errors;
  if (!errors || typeof errors !== 'object') return {};
  return { email: firstMessage(Reflect.get(errors, 'email')), password: firstMessage(Reflect.get(errors, 'password')) };
}

function isLoginResponse(payload: unknown): payload is LoginResponse {
  if (!payload || typeof payload !== 'object') return false;
  const token = Reflect.get(payload, 'token');
  const expiresAt = Reflect.get(payload, 'expires_at');
  const user = Reflect.get(payload, 'user');
  return typeof token === 'string' && token.length > 0
    && typeof expiresAt === 'string' && !Number.isNaN(Date.parse(expiresAt))
    && !!user && typeof user === 'object'
    && ['string', 'number'].includes(typeof Reflect.get(user, 'id'))
    && typeof Reflect.get(user, 'name') === 'string'
    && typeof Reflect.get(user, 'email') === 'string'
    && typeof Reflect.get(user, 'role') === 'string';
}

function loginUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!apiUrl) throw new AuthError('CONFIGURATION', 'O endereço da API não está configurado.');
  return `${apiUrl}/mobile/login`;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  let response: Response;
  try {
    response = await fetch(loginUrl(), {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('NETWORK', 'Não foi possível contactar o serviço. Verifica a rede e tenta novamente.');
  }

  const payload: unknown = await response.json().catch(() => null);
  if (response.status === 422) throw new AuthError('VALIDATION', 'Confirma os dados introduzidos.', getValidationErrors(payload));
  if (response.status === 429) throw new AuthError('RATE_LIMITED', 'Foram feitas demasiadas tentativas. Aguarda um pouco e tenta novamente.');
  if (!response.ok) throw new AuthError('SERVER', 'Não foi possível iniciar sessão. Tenta novamente.');
  if (!isLoginResponse(payload)) throw new AuthError('INVALID_RESPONSE', 'A resposta do serviço não tem o formato esperado.');
  if (Date.parse(payload.expires_at) <= Date.now()) throw new AuthError('SESSION_EXPIRED', 'A sessão recebida já expirou. Inicia sessão novamente.');
  return payload;
}
