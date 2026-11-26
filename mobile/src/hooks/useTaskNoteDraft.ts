import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { readTaskNoteDraft, removeTaskNoteDraft, saveTaskNoteDraft } from '../services/taskNoteDrafts';

const SAVE_DELAY_MS = 400;

export function useTaskNoteDraft(userId: number | string | undefined, taskId: number, savedNotes: string | null) {
  const [notes, setNotes] = useState(savedNotes ?? '');
  const [restored, setRestored] = useState(false);
  const latest = useRef(notes);
  const initialSaved = useRef(savedNotes ?? '');
  const edited = useRef(false);
  const unsaved = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const flush = useCallback(() => {
    cancelTimer();
    if (!unsaved.current || userId === undefined) return;
    unsaved.current = false;
    void saveTaskNoteDraft(userId, taskId, latest.current);
  }, [cancelTimer, taskId, userId]);

  // Restores a draft when the task opens, unless the person has already started typing.
  useEffect(() => {
    if (userId === undefined) return;
    let active = true;

    void readTaskNoteDraft(userId, taskId).then((draft) => {
      if (!active || edited.current || draft === null) return;

      if (draft.trim() === initialSaved.current.trim()) {
        void removeTaskNoteDraft(userId, taskId);
        return;
      }

      latest.current = draft;
      setNotes(draft);
      setRestored(true);
    });

    return () => { active = false; };
  }, [taskId, userId]);

  // Saves right away when the app leaves the screen or goes to the background.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') flush();
    });

    return () => {
      subscription.remove();
      flush();
    };
  }, [flush]);

  function change(text: string) {
    edited.current = true;
    unsaved.current = true;
    latest.current = text;
    setNotes(text);
    setRestored(false);
    cancelTimer();
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  // Called only after the API confirms. Text typed during the request stays as a draft.
  async function markSent(sent: string) {
    if (latest.current !== sent || userId === undefined) return;
    cancelTimer();
    unsaved.current = false;
    setRestored(false);
    await removeTaskNoteDraft(userId, taskId);
  }

  async function discard(serverNotes: string | null) {
    cancelTimer();
    edited.current = true;
    unsaved.current = false;
    latest.current = serverNotes ?? '';
    setNotes(latest.current);
    setRestored(false);
    if (userId !== undefined) await removeTaskNoteDraft(userId, taskId);
  }

  return { notes, restored, change, flush, markSent, discard };
}