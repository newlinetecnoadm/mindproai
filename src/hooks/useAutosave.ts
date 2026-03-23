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
 */
export function useAutosave<T>(data: T, { onSave, debounceMs = 800, onStatusChange }: AutosaveOptions<T>) {
  const dataRef = useRef<T>(data);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Sync ref with incoming data, but don't trigger re-renders
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const triggerSave = useCallback((immediateData?: T) => {
    if (immediateData) {
      dataRef.current = immediateData;
    }
    
    // Clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);
    
    // We don't immediately set status to idle to avoid flicker if it was already saved
    
    timerRef.current = setTimeout(async () => {
      onStatusChange?.('saving');
      try {
        await onSaveRef.current(dataRef.current);
        onStatusChange?.('saved');
      } catch (e) {
        console.error("Autosave internal error:", e);
        onStatusChange?.('error');
      }
    }, debounceMs);
  }, [debounceMs, onStatusChange]);

  // Immediate save on unmount if there's a pending change
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // Important: this fire-and-forget save on unmount
        onSaveRef.current(dataRef.current).catch(err => {
          console.error("Final unmount save failed:", err);
        });
      }
    };
  }, []);

  return { triggerSave };
}
