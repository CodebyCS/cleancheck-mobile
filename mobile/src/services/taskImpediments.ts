import { AuthError } from './auth';
import { apiUrl, fetchWithTimeout, HttpClientError } from './httpClient';
import { AuthenticatedFetch } from './tasks';

export type TaskImpedimentSubmission = {
  reason: string;
  description: string | null;
  idempotency_key: string;
};

export type TaskImpedimentRecord = {
  id: number;
  task_id: number;
  user_id: number;
  reason: string;
  description: string | null;
  created_at: string;
};

export type TaskImpedimentErrorCode =
  | 'CONFIGURATION'
  | 'NETWORK'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'SERVER'
  | 'INVALID_RESPONSE';

export type TaskImpedimentFieldErrors = {
  reason?: string;
  description?: string;
};

export class TaskImpedimentError extends Error {
  constructor(
    public readonly code: TaskImpedimentErrorCode,
    message: string,
    public readonly fieldErrors: TaskImpedimentFieldErrors = {},
  ) {
    super(message);
    this.name = 'TaskImpedimentError';
  }
}

function firstMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
}

function payloadMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const message = Reflect.get(payload, 'message');
  return typeof message === 'string' && message.trim() ? message : fallback;
}

function validationErrors(payload: unknown): TaskImpedimentFieldErrors {
  if (!payload || typeof payload !== 'object') return {};
  const errors = Reflect.get(payload, 'errors');
  if (!errors || typeof errors !== 'object') return {};
  return {
    reason: firstMessage(Reflect.get(errors, 'reason')),
    description: firstMessage(Reflect.get(errors, 'description')),
  };
}

function isImpedimentRecord(value: unknown): value is TaskImpedimentRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Number.isInteger(record.id)
    && Number.isInteger(record.task_id)
    && Number.isInteger(record.user_id)
    && typeof record.reason === 'string'
    && (record.description === null || typeof record.description === 'string')
    && typeof record.created_at === 'string';
}

export function createIdempotencyKey(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export async function registerTaskImpediment(
  taskId: number,
  submission: TaskImpedimentSubmission,
  authenticatedFetch: AuthenticatedFetch,
): Promise<{ record: TaskImpedimentRecord; repeated: boolean }> {
  let url: string;
  try {
    url = apiUrl(`/tasks/${taskId}/impediments`);
  } catch {
    throw new TaskImpedimentError('CONFIGURATION', 'O endereço da API não está configurado.');
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    }, authenticatedFetch);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'SESSION_EXPIRED') {
      throw new TaskImpedimentError('SESSION_EXPIRED', error.message);
    }
    if (error instanceof AuthError && error.code === 'FORBIDDEN') {
      throw new TaskImpedimentError('FORBIDDEN', error.message);
    }
    throw new TaskImpedimentError(
      error instanceof HttpClientError && error.code === 'CONFIGURATION' ? 'CONFIGURATION' : 'NETWORK',
      error instanceof HttpClientError && error.code === 'CONFIGURATION'
        ? 'O endereço da API não está configurado.'
        : error instanceof HttpClientError && error.code === 'TIMEOUT'
          ? 'O pedido demorou demasiado. A ligação pode ter sido interrompida; tenta novamente para confirmar o envio sem criar um duplicado.'
          : 'Não foi possível confirmar o envio. Verifica a ligação e tenta novamente para evitar um registo duplicado.',
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json() as unknown;
  } catch {
    if (response.ok) {
      throw new TaskImpedimentError('INVALID_RESPONSE', 'A API respondeu sem um registo de impedimento válido. Tenta novamente para confirmar o envio.');
    }
  }

  if (response.status === 401) {
    throw new TaskImpedimentError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
  }
  if (response.status === 403) {
    throw new TaskImpedimentError('FORBIDDEN', payloadMessage(payload, 'Já não tens acesso a esta tarefa.'));
  }
  if (response.status === 404) {
    throw new TaskImpedimentError('NOT_FOUND', payloadMessage(payload, 'Esta tarefa já não existe.'));
  }
  if (response.status === 409) {
    throw new TaskImpedimentError('CONFLICT', payloadMessage(payload, 'Esta chave de envio já foi usada com outros dados. Confirma o envio antes de criar outro impedimento.'));
  }
  if (response.status === 422) {
    throw new TaskImpedimentError(
      'VALIDATION',
      payloadMessage(payload, 'Corrige os campos assinalados e tenta novamente.'),
      validationErrors(payload),
    );
  }
  if (response.status !== 200 && response.status !== 201) {
    throw new TaskImpedimentError('SERVER', payloadMessage(payload, 'Não foi possível registar o impedimento. Tenta novamente.'));
  }
  if (!isImpedimentRecord(payload) || payload.task_id !== taskId) {
    throw new TaskImpedimentError('INVALID_RESPONSE', 'A API devolveu um registo de impedimento inválido. Tenta novamente para confirmar o envio.');
  }

  return { record: payload, repeated: response.status === 200 };
}
