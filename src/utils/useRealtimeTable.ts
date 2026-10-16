import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

interface Options {
  table: string;
  orderBy?: string;
  ascending?: boolean;
  filter?: { column: string; value: string }; // opcional, ej: case_id
}

export function useRealtimeTable<T extends { id: string }>({
  table,
  orderBy = "created_at",
  ascending = false,
  filter,
}: Options) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let q = supabase.from(table).select("*");
    if (filter) q = q.eq(filter.column, filter.value);
    const { data: rows, error } = await q.order(orderBy, { ascending });
    if (error) console.error(`Error cargando ${table}:`, error.message);
    else setData((rows as T[]) ?? []);
    setLoading(false);
  }, [table, orderBy, ascending, filter?.column, filter?.value]);

  useEffect(() => {
    load();

    const channel = supabase
      .channel(`rt-${table}-${filter?.value ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setData((prev) =>
              prev.some((r) => r.id === (payload.new as T).id)
                ? prev
                : [payload.new as T, ...prev]
            );
          } else if (payload.eventType === "UPDATE") {
            setData((prev) =>
              prev.map((r) => (r.id === (payload.new as T).id ? (payload.new as T) : r))
            );
          } else if (payload.eventType === "DELETE") {
            setData((prev) => prev.filter((r) => r.id !== (payload.old as T).id));
          }
        }
      )
      .subscribe((status) => {
        // Si se reconecta tras perder internet, recarga para no quedar desfasado
        if (status === "SUBSCRIBED") load();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, table, filter?.column, filter?.value]);

  return { data, loading, reload: load };
}