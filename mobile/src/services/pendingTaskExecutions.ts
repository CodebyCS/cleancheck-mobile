import * as SecureStore from 'expo-secure-store';
import type { TaskExecutionSubmission } from './tasks';

export type TaskExecutionKind = 'execution' | 'checkout-inspection';
export type PendingTaskExecution = {
  taskId: number;
  userId: number | string;
  kind: TaskExecutionKind;
  submission: TaskExecutionSubmission;
};

export type PendingReconciliation<T> = {
  pending: PendingTaskExecution | undefined;
  confirmed: T | null;
  error?: unknown;
};

/**
 * Reconcile local pending data with the server without losing the retry when
 * the confirmation lookup fails (for example, while the device is offline).
 */
export async function reconcilePendingTaskExecution<T>(
  pending: PendingTaskExecution | undefined,
  loadConfirmed: () => Promise<T | null>,
  getIdempotencyKey: (record: T) => string | null,
): Promise<PendingReconciliation<T>> {
  try {
    const confirmed = await loadConfirmed();
    if (pending && confirmed && getIdempotencyKey(confirmed) === pending.submission.idempotency_key) {
      return { pending: undefined, confirmed };
    }
    return { pending, confirmed };
  } catch (error) {
    return { pending, confirmed: null, error };
  }
}

const INDEX_KEY = 'cleancheck.task-executions.pending.v1';
const CHUNK_BYTES = 900;
type Entry = { taskId: number; userId: number | string; kind: TaskExecutionKind; key: string; chunks: number };

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return Number.isInteger(item.taskId) && ['number', 'string'].includes(typeof item.userId)
    && (item.kind === 'execution' || item.kind === 'checkout-inspection')
    && typeof item.key === 'string' && Number.isInteger(item.chunks) && (item.chunks as number) > 0;
}

function splitUtf8(value: string): string[] {
  const result: string[] = [];
  let chunk = '';
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    const size = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (chunk && bytes + size > CHUNK_BYTES) {
      result.push(chunk);
      chunk = '';
      bytes = 0;
    }
    chunk += character;
    bytes += size;
  }
  if (chunk) result.push(chunk);
  return result;
}

async function readIndex(): Promise<Entry[]> {
  const text = await SecureStore.getItemAsync(INDEX_KEY);
  if (!text) return [];
  try {
    const value: unknown = JSON.parse(text);
    if (Array.isArray(value) && value.every(isEntry)) return value;
  } catch { /* Keep unknown data and block submissions rather than risk duplicates. */ }
  throw new Error('Não foi possível ler o envio pendente guardado.');
}

function matches(entry: Entry, taskId: number, userId: number | string, kind?: TaskExecutionKind) {
  return entry.taskId === taskId && String(entry.userId) === String(userId) && (!kind || entry.kind === kind);
}

async function readEntry(entry: Entry): Promise<PendingTaskExecution> {
  let serialized = '';
  for (let index = 0; index < entry.chunks; index += 1) {
    const chunk = await SecureStore.getItemAsync(`${entry.key}.${index}`);
    if (chunk === null) throw new Error('O envio pendente está incompleto; não cries outro envio.');
    serialized += chunk;
  }
  const value = JSON.parse(serialized) as PendingTaskExecution;
  if (value.taskId !== entry.taskId || String(value.userId) !== String(entry.userId)
    || value.kind !== entry.kind || value.submission.idempotency_key !== entry.key.split('.').at(-1)) {
    throw new Error('O envio pendente guardado é inválido; não cries outro envio.');
  }
  return value;
}

export async function getPendingTaskExecution(taskId: number, userId: number | string, kind: TaskExecutionKind): Promise<PendingTaskExecution | null> {
  const entry = (await readIndex()).find((item) => matches(item, taskId, userId, kind));
  return entry ? readEntry(entry) : null;
}

export async function savePendingTaskExecution(value: PendingTaskExecution): Promise<void> {
  const entries = await readIndex();
  if (entries.some((item) => matches(item, value.taskId, value.userId, value.kind))) {
    throw new Error('Já existe um envio por confirmar. Repete os mesmos dados antes de iniciar outro.');
  }
  const serialized = JSON.stringify(value);
  const chunks = splitUtf8(serialized);
  const storageKey = `${INDEX_KEY}.${value.taskId}.${value.userId}.${value.kind}.${value.submission.idempotency_key}`;
  const entry: Entry = { taskId: value.taskId, userId: value.userId, kind: value.kind, key: storageKey, chunks: chunks.length };
  try {
    for (let i = 0; i < chunks.length; i += 1) await SecureStore.setItemAsync(`${storageKey}.${i}`, chunks[i]);
    await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify([...entries, entry]));
  } catch (error) {
    await Promise.all(chunks.map((_, i) => SecureStore.deleteItemAsync(`${storageKey}.${i}`))).catch(() => undefined);
    throw error;
  }
}

export async function removePendingTaskExecution(taskId: number, userId: number | string, kind: TaskExecutionKind): Promise<void> {
  const entries = await readIndex();
  const removed = entries.filter((item) => matches(item, taskId, userId, kind));
  await Promise.all(removed.flatMap((entry) => Array.from({ length: entry.chunks }, (_, i) => SecureStore.deleteItemAsync(`${entry.key}.${i}`))));
  const remaining = entries.filter((item) => !matches(item, taskId, userId, kind));
  if (remaining.length) await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(remaining));
  else await SecureStore.deleteItemAsync(INDEX_KEY);
}

export async function clearPendingTaskExecutions(): Promise<void> {
  const entries = await readIndex();
  await Promise.all(entries.flatMap((entry) => Array.from({ length: entry.chunks }, (_, i) => SecureStore.deleteItemAsync(`${entry.key}.${i}`))));
  await SecureStore.deleteItemAsync(INDEX_KEY);
}
