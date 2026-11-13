import { AuthError } from './auth';
import { apiUrl, fetchWithTimeout } from './httpClient';

export type TaskListItem = {
  id: number;
  property: string | null;
  type: string;
  scheduled_start_at: string;
  status: string;
};

export type TaskDetail = TaskListItem & {
  address: string | null;
  scheduled_end_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

export type AuthenticatedFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type TaskErrorCode = 'CONFIGURATION' | 'NETWORK' | 'SESSION_EXPIRED' | 'FORBIDDEN' | 'NOT_FOUND' | 'SERVER' | 'INVALID_RESPONSE';

export class TaskError extends Error {
  constructor(public readonly code: TaskErrorCode, message: string) {
    super(message);
    this.name = 'TaskError';
  }
}

function taskUrl(path: string): string {
  try {
    return apiUrl(path);
  } catch {
    throw new TaskError('CONFIGURATION', 'O endereço da API não está configurado.');
  }
}

async function getJson(path: string, authenticatedFetch: AuthenticatedFetch): Promise<unknown> {
  const url = taskUrl(path);
  let response: Response;
  try {
    response = await fetchWithTimeout(url, {}, authenticatedFetch);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'SESSION_EXPIRED') {
      throw new TaskError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
    }
    throw new TaskError('NETWORK', 'Não foi possível carregar as tarefas. Verifica a ligação e tenta novamente.');
  }
  if (response.status === 404) {
    throw new TaskError('NOT_FOUND', 'Esta tarefa já não está disponível para a tua conta.');
  }
  if (response.status === 403) {
    throw new TaskError('FORBIDDEN', 'Já não tens acesso a esta tarefa. A agenda foi atualizada.');
  }
  if (!response.ok) {
    throw new TaskError('SERVER', 'Não foi possível carregar as tarefas. Tenta novamente.');
  }
  try {
    return await response.json() as unknown;
  } catch {
    throw new TaskError('INVALID_RESPONSE', 'A API devolveu dados de tarefas inválidos.');
  }
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isTaskListItem(value: unknown): value is TaskListItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return Number.isInteger(item.id) && typeof item.id === 'number'
    && isNullableString(item.property)
    && typeof item.type === 'string'
    && typeof item.scheduled_start_at === 'string'
    && !Number.isNaN(Date.parse(item.scheduled_start_at))
    && typeof item.status === 'string';
}

function isTaskDetail(value: unknown): value is TaskDetail {
  if (!isTaskListItem(value)) return false;
  const item = value as unknown as Record<string, unknown>;
  return isNullableString(item.address)
    && isNullableString(item.scheduled_end_at)
    && isNullableString(item.started_at)
    && isNullableString(item.completed_at);
}

export async function listMyTasks(authenticatedFetch: AuthenticatedFetch): Promise<TaskListItem[]> {
  const payload = await getJson('/tasks', authenticatedFetch);
  if (!Array.isArray(payload) || !payload.every(isTaskListItem)) {
    throw new TaskError('INVALID_RESPONSE', 'A lista de tarefas devolvida pela API é inválida.');
  }
  return payload;
}

export async function getMyTask(id: number, authenticatedFetch: AuthenticatedFetch): Promise<TaskDetail> {
  const payload = await getJson(`/my/tasks/${id}`, authenticatedFetch);
  const task = payload && typeof payload === 'object' && 'data' in payload
    ? (payload as { data: unknown }).data
    : null;
  if (!task || typeof task !== 'object') {
    throw new TaskError('INVALID_RESPONSE', 'O detalhe da tarefa devolvido pela API é inválido.');
  }
  const responseTask = task as Record<string, unknown>;
  const detail = {
    ...responseTask,
    address: responseTask.property_address ?? responseTask.address ?? null,
  };
  if (!isTaskDetail(detail) || detail.id !== id) {
    throw new TaskError('INVALID_RESPONSE', 'O detalhe da tarefa devolvido pela API é inválido.');
  }
  return detail;
}

export function taskTypeLabel(type: string): string {
  if (type === 'checkout_cleaning') return 'Limpeza após checkout';
  if (type === 'checkin_inspection') return 'Inspeção antes do check-in';
  return type;
}

export function taskStatusLabel(status: string): string {
  if (status === 'pending') return 'PENDENTE';
  if (status === 'in_progress') return 'EM CURSO';
  if (status === 'completed') return 'CONCLUÍDA';
  if (status === 'cancelled') return 'CANCELADA';
  return status.toUpperCase();
}

export function taskDateLabel(value: string | null): string {
  if (!value) return 'Não definida';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Data inválida'
    : new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function isToday(value: string, now = new Date()): boolean {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

