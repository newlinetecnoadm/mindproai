import { useRef, useEffect, useCallback } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutosaveOptions<T> {
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  onStatusChange?: (status: AutosaveStatus) => void;
}

/**
 * useAutosave hook for "silent" persistence.
 * Maintains data in a ref to avoid re-renders and race conditions during save.
 * Uses isDirtyRef to ensure unmount only persists genuinely unsaved changes.
 */
export function useAutosave<T>(data: T, { onSave, debounceMs = 800, onStatusChange }: AutosaveOptions<T>) {
  const dataRef = useRef<T>(data);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = useRef(onSave);
  const isDirtyRef = useRef(false);
  onSaveRef.current = onSave;

  // Sync ref with incoming data, but don't trigger re-renders
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const triggerSave = useCallback((immediateData?: T) => {
    if (immediateData) {
      dataRef.current = immediateData;
    }

    // Mark as dirty — there is unsaved data
    isDirtyRef.current = true;

    // Clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      onStatusChange?.('saving');
      try {
        await onSaveRef.current(dataRef.current);
        isDirtyRef.current = false;
        onStatusChange?.('saved');
      } catch (e) {
        console.error("Autosave internal error:", e);
        onStatusChange?.('error');
      }
    }, debounceMs);
  }, [debounceMs, onStatusChange]);

  // On unmount: only save if there's a pending (dirty) change
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Only persist if data actually changed since last successful save
        if (isDirtyRef.current) {
          onSaveRef.current(dataRef.current).catch(err => {
            console.error("Final unmount save failed:", err);
          });
        }
      }
    };
  }, []);

  return { triggerSave };
}
