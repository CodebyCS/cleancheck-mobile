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
  provider_notes: string | null;
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

async function getJson(path: string, authenticatedFetch: AuthenticatedFetch, init: RequestInit = {},): Promise<unknown> {
  const url = taskUrl(path);
  let response: Response;

  try {
    response = await fetchWithTimeout(url, init, authenticatedFetch);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

type TaskPageResponse = {
  data: unknown[];
  meta: {
    current_page: number;
    last_page: number;
  };
};

type TaskDetailResponse = TaskListItem & {
  property_address: string | null;
  scheduled_end_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  provider_notes: string | null;
};

function isTaskListItem(value: unknown): value is TaskListItem {
  if (!isRecord(value)) return false;

  return Number.isInteger(value.id)
    && typeof value.id === 'number'
    && isNullableString(value.property)
    && typeof value.type === 'string'
    && typeof value.scheduled_start_at === 'string'
    && !Number.isNaN(Date.parse(value.scheduled_start_at))
    && typeof value.status === 'string';
}

function isTaskPageResponse(value: unknown): value is TaskPageResponse {
  if (!isRecord(value) || !Array.isArray(value.data) || !isRecord(value.meta)) {
    return false;
  }

  const currentPage = value.meta.current_page;
  const lastPage = value.meta.last_page;

  return typeof currentPage === 'number'
    && Number.isInteger(currentPage)
    && currentPage >= 1
    && typeof lastPage === 'number'
    && Number.isInteger(lastPage)
    && lastPage >= currentPage;
}

function isTaskDetailResponse(value: unknown): value is TaskDetailResponse {
  if (!isRecord(value)) return false;

  if (
    !isNullableString(value.property_address)
    || !isNullableString(value.scheduled_end_at)
    || !isNullableString(value.started_at)
    || !isNullableString(value.completed_at)
    || !isNullableString(value.provider_notes)
  ) {
    return false;
  }

  return isTaskListItem(value);
}


export async function listMyTasks(
  authenticatedFetch: AuthenticatedFetch,
): Promise<TaskListItem[]> {
  const tasks: TaskListItem[] = [];
  let page = 1;
  let lastPage = 1;

  while (page <= lastPage) {
    const payload = await getJson(
      `/my/tasks?per_page=100&page=${page}`,
      authenticatedFetch,
    );

    if (!isTaskPageResponse(payload) || payload.meta.current_page !== page) {
      throw new TaskError(
        'INVALID_RESPONSE',
        'A lista de tarefas devolvida pela API é inválida.',
      );
    }

    if (!payload.data.every(isTaskListItem)) {
      throw new TaskError(
        'INVALID_RESPONSE',
        'A lista de tarefas devolvida pela API é inválida.',
      );
    }

    tasks.push(...payload.data);
    lastPage = payload.meta.last_page;
    page += 1;
  }

  return tasks;
}

export async function getMyTask(
  id: number,
  authenticatedFetch: AuthenticatedFetch,
): Promise<TaskDetail> {
  const payload = await getJson(`/my/tasks/${id}`, authenticatedFetch);

  if (
    !isRecord(payload)
    || !isTaskDetailResponse(payload.data)
    || payload.data.id !== id
  ) {
    throw new TaskError(
      'INVALID_RESPONSE',
      'O detalhe da tarefa devolvido pela API é inválido.',
    );
  }

  const { property_address, ...task } = payload.data;

  return {
    ...task,
    address: property_address,
  };
}

export async function startMyTask(
  id: number,
  authenticatedFetch: AuthenticatedFetch,
): Promise<void> {
  await getJson(`/my/tasks/${id}/start`, authenticatedFetch, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
}

export async function completeMyTask(
  id: number,
  authenticatedFetch: AuthenticatedFetch,
): Promise<void> {
  await getJson(`/my/tasks/${id}/complete`, authenticatedFetch, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
}

export async function updateMyTaskNotes(
  id: number,
  providerNotes: string | null,
  authenticatedFetch: AuthenticatedFetch,
): Promise<void> {
  await getJson(`/my/tasks/${id}/notes`, authenticatedFetch, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ provider_notes: providerNotes }),
  });
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

