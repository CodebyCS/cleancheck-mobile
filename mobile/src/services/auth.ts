export const USER_ROLES = ['admin', 'supervisor', 'service_provider'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

export type LoginCredentials = { email: string; password: string; device_name?: string };
export type AuthUser = { id: number | string; name: string; email: string; role: UserRole };
export type LoginResponse = { token: string; expires_at: string; user: AuthUser };
export type LoginFieldErrors = { email?: string; password?: string };
export type AuthErrorCode = 'VALIDATION' | 'RATE_LIMITED' | 'NETWORK' | 'SERVER' | 'CONFIGURATION' | 'INVALID_RESPONSE' | 'SESSION_EXPIRED' | 'FORBIDDEN';

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
  if (!payload || typeof payload !== 'object') return {};

  const errors = Reflect.get(payload, 'errors');

  if (!errors || typeof errors !== 'object') return {};

  return { 
    email: firstMessage(Reflect.get(errors, 'email')), 
    password: firstMessage(Reflect.get(errors, 'password')) 
  };
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!value || typeof value !== 'object') return false;

  const token = Reflect.get(value, 'token');
  const expiresAt = Reflect.get(value, 'expires_at');

  return (
    typeof token === 'string' &&
    token.length > 0 &&
    typeof expiresAt === 'string' &&
    !Number.isNaN(Date.parse(expiresAt)) &&
    isAuthUser(Reflect.get(value, 'user'))
  );
}

function apiUrl(path: string): string {
  const base = process.env.EXPO_PUBLIC_API_URL
    ?.trim()
    .replace(/\/$/, '');
  if (!base || 
    !/^https?:\/\//i.test(base) ||
    base.includes('IP-DO-COMPUTADOR')) 
    {
      throw new AuthError(
        'CONFIGURATION', 
        'O endereço da API não está configurado.',
    );
  }
  return `${base}${path}`;
}

async function request(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; payload: unknown }> {
  const url = apiUrl(path);
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 10000);

  try {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');

    if (init.body) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        // A validação de cada operação identifica respostas inválidas.
      }
    }

    return { status: response.status, payload };
  } catch {
    throw new AuthError(
      'NETWORK',
      timedOut
        ? 'Tempo limite excedido. Verifica a API e a rede.'
        : 'Não foi possível contactar a API. Tenta novamente.',
    );
  } finally {
    clearTimeout(timer);
  }
}

function isAuthUser(value: unknown): value is AuthUser {
  if (!value || typeof value !== 'object') return false;

  const id = Reflect.get(value, 'id');
  const role = Reflect.get(value, 'role');

  return (
    (typeof id === 'number' || typeof id === 'string') &&
    typeof Reflect.get(value, 'name') === 'string' &&
    typeof Reflect.get(value, 'email') === 'string' &&
    isUserRole(role)
  );
}

export async function login(
  credentials: LoginCredentials
): Promise<LoginResponse> {
  const { status, payload } = await request('/mobile/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  if (status === 422) {
    throw new AuthError(
      'VALIDATION',
      'Confirma os dados introduzidos.',
      getValidationErrors(payload),
    );
  }

  if (status === 429) {
    throw new AuthError(
      'RATE_LIMITED',
      'Demasiadas tentativas. Aguarda antes de tentar novamente.',
    );
  }

  if (status !== 200) {
    throw new AuthError('SERVER', 'Não foi possível iniciar sessão.');
  }

  if (!isLoginResponse(payload)) {
    throw new AuthError(
      'INVALID_RESPONSE',
      'A resposta de login não tem o formato esperado.',
    );
  }

  if (Date.parse(payload.expires_at) <= Date.now()) {
    throw new AuthError('SESSION_EXPIRED', 'A sessão recebida já expirou.');
  }

  return payload;
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  const { status, payload } = await request('/user', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (status === 401) {
    throw new AuthError(
      'SESSION_EXPIRED',
      'A sessão já não é válida. Inicia sessão novamente.',
    );
  }

  if (status === 403) {
    throw new AuthError(
      'FORBIDDEN',
      'Esta conta não tem acesso. Contacta o administrador.',
    );
  }

  if (status !== 200) {
    throw new AuthError('SERVER', 'Não foi possível confirmar a sessão.');
  }

  if (!payload || typeof payload !== 'object') {
    throw new AuthError('INVALID_RESPONSE', 'Resposta de utilizador inválida.');
  }

  const user: unknown = Reflect.get(payload, 'data');

  if (!isAuthUser(user)) {
    throw new AuthError('INVALID_RESPONSE', 'Dados do utilizador inválidos.');
  }

  return user;
}

export async function logout(token: string): Promise<void> {
  const { status } = await request('/mobile/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // 204: token revogado. 401: já não existe autenticação válida.
  if (status === 204 || status === 401) return;

  throw new AuthError(
    'SERVER',
    'A API não confirmou o logout. Tenta novamente.',
  );
}
