import * as SecureStore from 'expo-secure-store';
import { TaskImpedimentSubmission } from './taskImpediments';

export type PendingTaskImpediment = {
  taskId: number;
  userId: number | string;
  submission: TaskImpedimentSubmission;
};

const PENDING_KEY = 'cleancheck.task-impediments.pending.v1';
const MAX_SECURE_VALUE_BYTES = 900;

type PendingIndexEntry = {
  taskId: number;
  userId: number | string;
  storageKey: string;
  descriptionChunks: number;
};

type StoredPendingTaskImpediment = {
  taskId: number;
  userId: number | string;
  reason: string;
  idempotencyKey: string;
  descriptionIsNull: boolean;
  descriptionChunks: number;
};

function isIndexEntry(value: unknown): value is PendingIndexEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return Number.isInteger(entry.taskId)
    && ['number', 'string'].includes(typeof entry.userId)
    && typeof entry.storageKey === 'string'
    && Number.isInteger(entry.descriptionChunks)
    && (entry.descriptionChunks as number) >= 0;
}

function utf8Bytes(character: string): number {
  const codePoint = character.codePointAt(0) ?? 0;
  if (codePoint <= 0x7f) return 1;
  if (codePoint <= 0x7ff) return 2;
  if (codePoint <= 0xffff) return 3;
  return 4;
}

function splitDescription(value: string): string[] {
  const chunks: string[] = [];
  let chunk = '';
  let bytes = 0;
  for (const character of value) {
    const size = utf8Bytes(character);
    if (chunk && bytes + size > MAX_SECURE_VALUE_BYTES) {
      chunks.push(chunk);
      chunk = '';
      bytes = 0;
    }
    chunk += character;
    bytes += size;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

function isStoredDraft(value: unknown): value is StoredPendingTaskImpediment {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  return Number.isInteger(draft.taskId)
    && ['number', 'string'].includes(typeof draft.userId)
    && typeof draft.reason === 'string'
    && typeof draft.idempotencyKey === 'string'
    && typeof draft.descriptionIsNull === 'boolean'
    && Number.isInteger(draft.descriptionChunks)
    && (draft.descriptionChunks as number) >= 0;
}

async function readIndex(): Promise<PendingIndexEntry[]> {
  const stored = await SecureStore.getItemAsync(PENDING_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.every(isIndexEntry)) return parsed;
  } catch {
    // Keep malformed secure data untouched; new submissions stay blocked until
    // the storage is cleared, since dropping an unknown retry could duplicate it.
  }
  throw new Error('Pending impediment index is unreadable.');
}

function matches(entry: PendingIndexEntry, taskId: number, userId: number | string): boolean {
  return entry.taskId === taskId && String(entry.userId) === String(userId);
}

async function readDraft(entry: PendingIndexEntry): Promise<PendingTaskImpediment> {
  const serialized = await SecureStore.getItemAsync(`${entry.storageKey}.meta`);
  if (!serialized) throw new Error('Pending impediment metadata is missing.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('Pending impediment metadata is unreadable.');
  }
  if (!isStoredDraft(parsed)
    || parsed.taskId !== entry.taskId
    || String(parsed.userId) !== String(entry.userId)
    || parsed.descriptionChunks !== entry.descriptionChunks) {
    throw new Error('Pending impediment metadata is invalid.');
  }

  let description = '';
  for (let index = 0; index < parsed.descriptionChunks; index += 1) {
    const chunk = await SecureStore.getItemAsync(`${entry.storageKey}.description.${index}`);
    if (chunk === null) throw new Error('Pending impediment description is incomplete.');
    description += chunk;
  }

  return {
    taskId: parsed.taskId,
    userId: parsed.userId,
    submission: {
      reason: parsed.reason,
      description: parsed.descriptionIsNull ? null : description,
      idempotency_key: parsed.idempotencyKey,
    },
  };
}

async function removeEntry(entry: PendingIndexEntry): Promise<void> {
  const keys = [`${entry.storageKey}.meta`];
  for (let index = 0; index < entry.descriptionChunks; index += 1) {
    keys.push(`${entry.storageKey}.description.${index}`);
  }
  await Promise.all(keys.map((key) => SecureStore.deleteItemAsync(key)));
}

export async function getPendingTaskImpediment(
  taskId: number,
  userId: number | string,
): Promise<PendingTaskImpediment | null> {
  const entries = await readIndex();
  const entry = entries.find((item) => matches(item, taskId, userId));
  return entry ? readDraft(entry) : null;
}

export async function savePendingTaskImpediment(draft: PendingTaskImpediment): Promise<void> {
  const entries = await readIndex();
  const previous = entries.filter((item) => matches(item, draft.taskId, draft.userId));
  if (previous.length > 0) {
    throw new Error('A pending impediment already exists for this task and user.');
  }
  const remaining = entries.filter((item) => !matches(item, draft.taskId, draft.userId));

  const description = draft.submission.description ?? '';
  const chunks = splitDescription(description);
  const storageKey = `${PENDING_KEY}.${draft.taskId}.${draft.submission.idempotency_key}`;
  const entry: PendingIndexEntry = {
    taskId: draft.taskId,
    userId: draft.userId,
    storageKey,
    descriptionChunks: chunks.length,
  };
  const storedDraft: StoredPendingTaskImpediment = {
    taskId: draft.taskId,
    userId: draft.userId,
    reason: draft.submission.reason,
    idempotencyKey: draft.submission.idempotency_key,
    descriptionIsNull: draft.submission.description === null,
    descriptionChunks: chunks.length,
  };

  try {
    for (let index = 0; index < chunks.length; index += 1) {
      await SecureStore.setItemAsync(`${storageKey}.description.${index}`, chunks[index]);
    }
    await SecureStore.setItemAsync(`${storageKey}.meta`, JSON.stringify(storedDraft));
    await SecureStore.setItemAsync(PENDING_KEY, JSON.stringify([...remaining, entry]));
  } catch (error) {
    await removeEntry(entry).catch(() => undefined);
    throw error;
  }
}

export async function removePendingTaskImpediment(
  taskId: number,
  userId: number | string,
): Promise<void> {
  const entries = await readIndex();
  const removed = entries.filter((entry) => matches(entry, taskId, userId));
  await Promise.all(removed.map(removeEntry));
  const remaining = entries.filter((entry) => !matches(entry, taskId, userId));
  if (remaining.length === 0) await SecureStore.deleteItemAsync(PENDING_KEY);
  else await SecureStore.setItemAsync(PENDING_KEY, JSON.stringify(remaining));
}

export async function clearPendingTaskImpediments(): Promise<void> {
  const entries = await readIndex();
  await Promise.all(entries.map(removeEntry));
  await SecureStore.deleteItemAsync(PENDING_KEY);
}
