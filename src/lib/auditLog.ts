import { getSupabaseConfig, supabase } from "./supabaseClient";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "PASSWORD_RESET";

export type AuditEntry = {
  id: string;
  actor_id?: string;
  actor_email: string;
  actor_name: string;
  action: AuditAction;
  entity: string;
  entity_id?: string;
  summary: string;
  created_at: string;
};

const AUDIT_STORAGE_KEY = "ja_legal_audit_log";

function readLocalAudit(): AuditEntry[] {
  try {
    const value = JSON.parse(localStorage.getItem(AUDIT_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeLocalAudit(entries: AuditEntry[]) {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(entries.slice(0, 300)));
  } catch (error) {
    console.warn("No se pudo guardar la bitácora local", error);
  }
}

export async function recordAuditEvent(event: Omit<AuditEntry, "id" | "created_at">): Promise<AuditEntry> {
  const entry: AuditEntry = {
    ...event,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  };
  writeLocalAudit([entry, ...readLocalAudit()]);

  if (getSupabaseConfig().isConfigured) {
    try {
      const { error } = await supabase.from("audit_logs").insert(entry);
      if (error) console.warn("Bitácora remota no disponible. Ejecuta la migración de auditoría en Supabase.", error.message);
    } catch (error) {
      console.warn("No se pudo sincronizar la bitácora con Supabase", error);
    }
  }
  return entry;
}

export async function fetchAuditEvents(limit = 100): Promise<AuditEntry[]> {
  if (getSupabaseConfig().isConfigured) {
    try {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (!error && Array.isArray(data)) {
        const entries = data as AuditEntry[];
        writeLocalAudit(entries);
        return entries;
      }
    } catch (error) {
      console.warn("No se pudo leer la bitácora remota", error);
    }
  }
  return readLocalAudit().slice(0, limit);
}

export async function isAuditLogReady(): Promise<boolean> {
  if (!getSupabaseConfig().isConfigured) return false;
  try {
    const { error } = await supabase.from("audit_logs").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}
