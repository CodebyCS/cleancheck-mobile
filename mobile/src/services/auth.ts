export type LoginCredentials = { phone: string; pin: string };
export type LoginResult = { token: string };
export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'NETWORK_ERROR';

export class AuthError extends Error {
  constructor(public readonly code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Serviço provisório: endpoint e pedido/resposta aguardam o contrato da API com o Carlos.
export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  // Valores de teste para validar os estados de erro sem uma API real.
  if (credentials.phone === '000000000') throw new AuthError('INVALID_CREDENTIALS', 'Invalid mock credentials');
  if (credentials.phone === '999999999') throw new AuthError('NETWORK_ERROR', 'Mock network failure');
  return { token: 'mock-token-not-for-production' };
}
