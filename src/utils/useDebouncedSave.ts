import { useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

/**
 * Guarda `value` automáticamente cuando el usuario deja de escribir (debounce).
 * - flush(): fuerza el guardado inmediato (úsalo al cerrar el editor).
 * - markSaved(v): declara que `v` ya está guardado (úsalo al cargar datos externos).
 */
export function useDebouncedSave<T>(
  value: T,
  onSave: (v: T) => Promise<void> | void,
  { delay = 800, enabled = true }: { delay?: number; enabled?: boolean } = {}
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const latest = useRef(value);
  const lastSaved = useRef(JSON.stringify(value));
  const saveRef = useRef(onSave);
  saveRef.current = onSave;
  latest.current = value;

  const flush = async () => {
    const ser = JSON.stringify(latest.current);
    if (ser === lastSaved.current) return;
    setStatus("saving");
    try {
      await saveRef.current(latest.current);
      lastSaved.current = ser;
      setStatus("saved");
    } catch (e) {
      console.error("Error en autoguardado:", e);
      setStatus("error");
    }
  };

  const serialized = JSON.stringify(value);

  useEffect(() => {
    if (!enabled || serialized === lastSaved.current) return;
    setStatus("pending");
    const t = setTimeout(flush, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, enabled, delay]);

  // Al desmontar guarda lo pendiente
  useEffect(() => () => { flush(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const markSaved = (v: T) => {
    lastSaved.current = JSON.stringify(v);
  };

  return { status, flush, markSaved };
}