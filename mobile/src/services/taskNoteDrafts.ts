import AsyncStorage from '@react-native-async-storage/async-storage';

type UserId = number | string;

const DRAFT_PREFIX = 'cleancheck.task-note-draft';

// Writes run one at a time, so an older save can never land after a removal.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = queue.then(operation, operation);
  queue = run.catch(() => undefined);
  return run;
}

function draftKey(userId: UserId, taskId: number): string {
  return `${DRAFT_PREFIX}.${userId}.${taskId}`;
}

// A storage failure must never block the person from writing or sending notes.
export async function readTaskNoteDraft(userId: UserId, taskId: number): Promise<string | null> {
  try {
    return await enqueue(() => AsyncStorage.getItem(draftKey(userId, taskId)));
  } catch {
    return null;
  }
}

export async function saveTaskNoteDraft(userId: UserId, taskId: number, notes: string): Promise<void> {
  try {
    await enqueue(() => AsyncStorage.setItem(draftKey(userId, taskId), notes));
  } catch {
    // The text is still on screen.
  }
}

export async function removeTaskNoteDraft(userId: UserId, taskId: number): Promise<void> {
  try {
    await enqueue(() => AsyncStorage.removeItem(draftKey(userId, taskId)));
  } catch {
    // A leftover equal to the saved notes is cleaned up when the task opens again.
  }
}