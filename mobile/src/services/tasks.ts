import { AuthError } from './auth';
import { apiUrl, fetchWithTimeout, HttpClientError } from './httpClient';
import { File } from 'expo-file-system';

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
    console.error('Task API request failed', path, error);
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

export type TaskEvidenceFile = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export type TaskEvidenceRecord = {
  id: number;
  kind: 'photo' | 'video';
  mime_type: string;
  size_bytes: number;
};

export function validateTaskEvidenceMetadata(
  kind: 'photo' | 'video',
  mimeType: string | null,
  sizeBytes: number | null,
  durationMs: number | null,
): string | null {
  const photoTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const videoTypes = ['video/mp4', 'video/quicktime'];
  const allowed = kind === 'video' ? videoTypes : photoTypes;
  if (!mimeType || !allowed.includes(mimeType.toLowerCase())) {
    return kind === 'video'
      ? 'Formato não aceite. Usa um vídeo MP4 ou MOV.'
      : 'Formato não aceite. Usa JPG, PNG, WEBP, HEIC ou HEIF.';
  }
  if (sizeBytes !== null && sizeBytes > (kind === 'video' ? 50 : 10) * 1024 * 1024) {
    return kind === 'video' ? 'O vídeo não pode ter mais de 50 MB.' : 'A fotografia não pode ter mais de 10 MB.';
  }
  if (kind === 'video' && durationMs !== null && durationMs > 60_000) {
    return 'O vídeo não pode ter mais de 60 segundos.';
  }
  return null;
}

export type TaskExecutionResponse = {
  key: string;
  value: string | number | boolean | null;
};

export type TaskExecutionSubmission = {
  idempotency_key: string;
  responses: TaskExecutionResponse[];
  observations: string | null;
  evidence_ids: number[];
};

export type TaskExecutionRecord = TaskExecutionSubmission & {
  id: number;
  task_id: number;
  user_id: number;
  send_state?: 'confirmed';
  confirmed_at?: string | null;
  recorded_at?: string | null;
};

export class TaskExecutionError extends Error {
  constructor(
    public readonly code: 'CONFIGURATION' | 'NETWORK' | 'SESSION_EXPIRED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' | 'SERVER' | 'INVALID_RESPONSE',
    message: string,
  ) {
    super(message);
    this.name = 'TaskExecutionError';
  }
}

export async function uploadMyTaskEvidence(
  id: number,
  file: TaskEvidenceFile,
  authenticatedFetch: AuthenticatedFetch,
): Promise<TaskEvidenceRecord> {
  const formData = new FormData();
  formData.append('file', new File(file.uri), file.fileName);

  let url: string;
  try { url = apiUrl(`/my/tasks/${id}/evidence`); }
  catch { throw new TaskError('CONFIGURATION', 'O endereço da API não está configurado.'); }
  let response: Response;
  try {
    response = await fetchWithTimeout(url, { method: 'POST', headers: { Accept: 'application/json' }, body: formData }, authenticatedFetch);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'SESSION_EXPIRED') throw new TaskError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
    if (error instanceof AuthError && error.code === 'FORBIDDEN') throw new TaskError('FORBIDDEN', 'Já não tens acesso atual a esta tarefa.');
    if (error instanceof HttpClientError && error.code === 'CONFIGURATION') throw new TaskError('CONFIGURATION', 'O endereço da API não está configurado.');
    throw new TaskError('NETWORK', 'Não foi possível confirmar o envio do ficheiro.');
  }
  let payload: unknown = null;
  try { payload = await response.json() as unknown; } catch { /* handled below */ }
  const message = isRecord(payload) && typeof payload.message === 'string' ? payload.message : '';
  const fileError = isRecord(payload) && isRecord(payload.errors)
    ? payload.errors.file
    : undefined;
  const validationMessage = typeof fileError === 'string'
    ? fileError
    : Array.isArray(fileError) && typeof fileError[0] === 'string' ? fileError[0] : '';
  if (response.status === 401) throw new TaskError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
  if (response.status === 403) throw new TaskError('FORBIDDEN', message || 'Já não tens acesso atual a esta tarefa.');
  if (response.status === 404) throw new TaskError('NOT_FOUND', message || 'Esta tarefa já não está disponível.');
  if (response.status === 422) throw new TaskError('SERVER', validationMessage || message || 'O ficheiro foi rejeitado pela API.');
  if (!response.ok) throw new TaskError('SERVER', message || 'A API não conseguiu guardar o ficheiro.');
  if (!isRecord(payload) || !isRecord(payload.data)) {
    throw new TaskError('INVALID_RESPONSE', 'A API não confirmou o ficheiro enviado.');
  }
  const record = payload.data;
  if (!Number.isInteger(record.id) || !Number.isInteger(record.size_bytes)
    || (record.kind !== 'photo' && record.kind !== 'video')
    || typeof record.mime_type !== 'string') {
    throw new TaskError('INVALID_RESPONSE', 'A API não confirmou o ficheiro enviado.');
  }
  return record as TaskEvidenceRecord;
}

function isTaskExecutionRecord(value: unknown, taskId: number, key: string): value is TaskExecutionRecord {
  if (!isRecord(value)) return false;
  return Number.isInteger(value.id) && value.task_id === taskId
    && typeof value.user_id === 'number' && value.idempotency_key === key
    && Array.isArray(value.responses) && Array.isArray(value.evidence_ids)
    && (value.send_state === undefined || value.send_state === 'confirmed');
}

export async function submitMyTaskExecution(
  taskId: number,
  submission: TaskExecutionSubmission,
  authenticatedFetch: AuthenticatedFetch,
): Promise<{ record: TaskExecutionRecord; repeated: boolean }> {
  let url: string;
  try { url = apiUrl(`/my/tasks/${taskId}/executions`); }
  catch { throw new TaskExecutionError('CONFIGURATION', 'O endereço da API não está configurado.'); }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    }, authenticatedFetch);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'SESSION_EXPIRED') {
      throw new TaskExecutionError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
    }
    if (error instanceof HttpClientError && error.code === 'CONFIGURATION') {
      throw new TaskExecutionError('CONFIGURATION', 'O endereço da API não está configurado.');
    }
    throw new TaskExecutionError('NETWORK', 'Não foi possível confirmar o envio da execução. Mantivemos os dados e a chave; tenta novamente.');
  }

  let payload: unknown;
  try { payload = await response.json() as unknown; }
  catch { payload = null; }
  const apiMessage = isRecord(payload) && typeof payload.message === 'string' ? payload.message : '';
  if (response.status === 401) throw new TaskExecutionError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
  if (response.status === 403) throw new TaskExecutionError('FORBIDDEN', apiMessage || 'Já não tens acesso atual a esta tarefa.');
  if (response.status === 404) throw new TaskExecutionError('NOT_FOUND', apiMessage || 'Esta tarefa já não está disponível.');
  if (response.status === 409) throw new TaskExecutionError('CONFLICT', apiMessage || 'A chave de envio já está associada a outros dados. Mantivemos o envio pendente.');
  if (response.status === 422) throw new TaskExecutionError('VALIDATION', apiMessage || 'A API rejeitou os dados. Revê as respostas e tenta novamente.');
  if (response.status !== 200 && response.status !== 201) throw new TaskExecutionError('SERVER', apiMessage || 'Não foi possível guardar a execução.');
  if (!isRecord(payload) || !isTaskExecutionRecord(payload.data, taskId, submission.idempotency_key)) {
    throw new TaskExecutionError('INVALID_RESPONSE', 'A API não confirmou a execução. Mantivemos os dados e a chave para repetires o pedido.');
  }
  return { record: payload.data, repeated: response.status === 200 };
}

export async function submitMyTaskCheckoutInspection(
  taskId: number,
  submission: TaskExecutionSubmission,
  authenticatedFetch: AuthenticatedFetch,
): Promise<{ record: TaskExecutionRecord; repeated: boolean }> {
  let url: string;
  try { url = apiUrl(`/my/tasks/${taskId}/checkout-inspection`); }
  catch { throw new TaskExecutionError('CONFIGURATION', 'O endereço da API não está configurado.'); }
  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    }, authenticatedFetch);
  } catch (error) {
    if (error instanceof AuthError && error.code === 'SESSION_EXPIRED') throw new TaskExecutionError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
    if (error instanceof HttpClientError && error.code === 'CONFIGURATION') throw new TaskExecutionError('CONFIGURATION', 'O endereço da API não está configurado.');
    throw new TaskExecutionError('NETWORK', 'Não foi possível confirmar a vistoria de saída. Mantivemos os dados e a chave; tenta novamente.');
  }
  let payload: unknown;
  try { payload = await response.json() as unknown; } catch { payload = null; }
  const apiMessage = isRecord(payload) && typeof payload.message === 'string' ? payload.message : '';
  if (response.status === 401) throw new TaskExecutionError('SESSION_EXPIRED', 'A sessão expirou. Inicia sessão novamente.');
  if (response.status === 403) throw new TaskExecutionError('FORBIDDEN', apiMessage || 'Já não tens acesso atual a esta tarefa.');
  if (response.status === 404) throw new TaskExecutionError('NOT_FOUND', apiMessage || 'Esta tarefa já não está disponível.');
  if (response.status === 409) throw new TaskExecutionError('CONFLICT', apiMessage || 'Já existe uma vistoria de saída diferente para esta tarefa.');
  if (response.status === 422) throw new TaskExecutionError('VALIDATION', apiMessage || 'A vistoria ainda não pode ser registada. Confirma o prazo e os dados.');
  if (response.status !== 200 && response.status !== 201) throw new TaskExecutionError('SERVER', apiMessage || 'Não foi possível guardar a vistoria de saída.');
  if (!isRecord(payload) || !isTaskExecutionRecord(payload.data, taskId, submission.idempotency_key)) {
    throw new TaskExecutionError('INVALID_RESPONSE', 'A API não confirmou a vistoria. Mantivemos os dados e a chave para repetires o pedido.');
  }
  return { record: payload.data, repeated: response.status === 200 };
}

export async function getMyTaskCheckoutInspection(
  taskId: number,
  authenticatedFetch: AuthenticatedFetch,
): Promise<TaskExecutionRecord | null> {
  const payload = await getJson(`/my/tasks/${taskId}/checkout-inspection`, authenticatedFetch);
  if (!isRecord(payload) || !('data' in payload)) {
    throw new TaskError('INVALID_RESPONSE', 'A resposta da vistoria de saída é inválida.');
  }
  if (payload.data === null) return null;
  if (!isTaskExecutionRecord(payload.data, taskId, (payload.data as Record<string, unknown>).idempotency_key as string)) {
    throw new TaskError('INVALID_RESPONSE', 'A resposta da vistoria de saída é inválida.');
  }
  return payload.data;
}

export async function listMyTaskExecutions(
  taskId: number,
  authenticatedFetch: AuthenticatedFetch,
): Promise<TaskExecutionRecord[]> {
  const payload = await getJson(`/my/tasks/${taskId}/executions`, authenticatedFetch);
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new TaskError('INVALID_RESPONSE', 'A lista de execuções devolvida pela API é inválida.');
  }
  const records = payload.data;
  if (!records.every((record) => isRecord(record)
    && isTaskExecutionRecord(record, taskId, typeof record.idempotency_key === 'string' ? record.idempotency_key : '')
    && record.send_state === 'confirmed')) {
    throw new TaskError('INVALID_RESPONSE', 'A lista de execuções devolvida pela API é inválida.');
  }
  return records as TaskExecutionRecord[];
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

