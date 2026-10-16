import { createClient, type Session } from "@supabase/supabase-js";
import { defaultAgenda, defaultHistory, defaultDocuments, defaultFinances } from "../data/initialData";
import type { CaseRecord, AgendaItem, HistoryItem, DocumentItem, FinancialRecord } from "../types/portal";

// =========================================================================
// CONSTANTES
// =========================================================================
export const SUPER_ADMIN_EMAIL = "eldavidprz@gmail.com";
export const ADMIN_1_EMAIL = "marlon.jimenez@jalegal.com.co";
export const ADMIN_2_EMAIL = "sebastian.ariza@jalegal.com.co";
const FIRM_EMAILS = [SUPER_ADMIN_EMAIL, ADMIN_1_EMAIL, ADMIN_2_EMAIL].map((e) => e.toLowerCase());

const STORAGE_BUCKET = "case-documents";

const STORAGE_SUPABASE_URL_KEY = "ja_legal_supabase_url";
const STORAGE_SUPABASE_ANON_KEY = "ja_legal_supabase_anon_key";
const STORAGE_CASE_KEY = "ja_legal_case_data";
const STORAGE_CASES_LIST_KEY = "ja_legal_cases_list";
const STORAGE_AGENDA_KEY = "ja_legal_agenda_data";
const STORAGE_HISTORY_KEY = "ja_legal_history_data";
const STORAGE_DOCS_KEY = "ja_legal_docs_data";
const STORAGE_FINANCES_KEY = "ja_legal_finances_data";
const STORAGE_SESSION_KEY = "ja_legal_session";
const STORAGE_USERS_KEY = "ja_legal_registered_users";

export type StoredUser = {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  initials: string;
  role: "client" | "firm";
  id_number?: string;
  phone?: string;
  created_at?: string;
};

// =========================================================================
// CONFIGURACIÓN DE SUPABASE
// Prioridad: variables de entorno (.env / Vercel) > valores guardados en la interfaz
// =========================================================================
export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  try {
    const env = import.meta.env as Record<string, string | undefined>;
    const envUrl = (env.VITE_SUPABASE_URL || "").trim();
    const envKey = (env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();

    let url = envUrl;
    let anonKey = envKey;
    if (!(url && anonKey)) {
      url = (localStorage.getItem(STORAGE_SUPABASE_URL_KEY) || "").trim();
      anonKey = (localStorage.getItem(STORAGE_SUPABASE_ANON_KEY) || "").trim();
    }

    const isConfigured = Boolean(url && anonKey && url.startsWith("https://") && anonKey.length > 20);
    return { url, anonKey, isConfigured };
  } catch {
    return { url: "", anonKey: "", isConfigured: false };
  }
}

export const isConfiguredWithRealSupabase = getSupabaseConfig().isConfigured;

export function saveSupabaseConfig(url: string, anonKey: string) {
  try {
    localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_SUPABASE_ANON_KEY, anonKey.trim());
  } catch (e) {
    console.warn("Error guardando credenciales de Supabase", e);
  }
}

export function clearSupabaseConfig() {
  try {
    localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
    localStorage.removeItem(STORAGE_SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn("Error limpiando credenciales de Supabase", e);
  }
}

// =========================================================================
// UTILIDADES
// =========================================================================
export function generateUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function pick(obj: any, cols: string[]) {
  const out: any = {};
  for (const c of cols) if (obj[c] !== undefined) out[c] = obj[c];
  return out;
}

const CASE_COLS = [
  "id", "client_id", "client_email", "client_name", "radicado", "title", "process_type", "status",
  "progress", "balance", "total_fees", "authority", "city", "lawyer", "observations",
  "current_phase", "documents_count", "filed_date", "last_update",
];
const AGENDA_COLS = ["id", "case_id", "event_date", "event_time", "title", "detail", "type", "location", "virtual_link"];
const HISTORY_COLS = ["id", "case_id", "event_date", "title", "detail", "note", "stage", "is_milestone"];
const DOC_COLS = ["id", "case_id", "name", "category", "file_size", "uploaded_at", "download_url", "status"];
const FIN_COLS = [
  "id", "case_id", "client_id", "client_name", "type", "category", "concept", "amount", "date",
  "status", "payment_method", "receipt_number", "notes",
];

function formatFileSize(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || "application/octet-stream";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function safeFileName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.\-]+/g, "_");
}

// =========================================================================
// USUARIOS LOCALES (solo para modo local sin Supabase)
// =========================================================================
export const INITIAL_FIRM_ADMINS: StoredUser[] = [
  {
    id: "usr_superadmin_david",
    email: SUPER_ADMIN_EMAIL,
    password: "Admin2026*",
    full_name: "David Pérez",
    initials: "DP",
    role: "firm",
    id_number: "Super Admin Titular",
    phone: "+57 300 000 0000",
  },
  {
    id: "usr_admin_marlon",
    email: ADMIN_1_EMAIL,
    password: "Admin2026*",
    full_name: "Dr. Marlon Jiménez",
    initials: "MJ",
    role: "firm",
    id_number: "T.P. 182.904 del C.S.J.",
    phone: "+57 312 214 9562",
  },
  {
    id: "usr_admin_sebastian",
    email: ADMIN_2_EMAIL,
    password: "Admin2026*",
    full_name: "Dr. Felipe Sebastián Ariza",
    initials: "SA",
    role: "firm",
    id_number: "T.P. 195.420 del C.S.J.",
    phone: "+57 315 220 1199",
  },
];
export const INITIAL_SUPERADMIN_USER = INITIAL_FIRM_ADMINS[0];

export function canCreateAccounts(user?: { email?: string | null; role?: string } | null): boolean {
  return Boolean(user?.email && FIRM_EMAILS.includes(user.email.toLowerCase().trim()));
}

export function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    let list: StoredUser[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.filter(
          (u) => u.email.toLowerCase() !== "abogado@jalegal.com.co" && u.email.toLowerCase() !== "cliente@jalegal.com.co"
        );
      }
    }
    for (const admin of INITIAL_FIRM_ADMINS) {
      if (!list.some((u) => u.email.toLowerCase() === admin.email.toLowerCase())) list.unshift(admin);
    }
    list = list.map((u) => (FIRM_EMAILS.includes(u.email.toLowerCase()) ? { ...u, role: "firm" as const } : u));
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.warn("Error leyendo usuarios locales", e);
    return [...INITIAL_FIRM_ADMINS];
  }
}

export function saveStoredUser(user: StoredUser) {
  try {
    const users = getStoredUsers().filter(
      (u) => u.email.toLowerCase() !== user.email.toLowerCase() && u.id !== user.id
    );
    users.push(user);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Error guardando usuario", e);
  }
}

export function deleteStoredUser(userId: string) {
  try {
    const users = getStoredUsers().filter((u) => u.id !== userId && u.email.toLowerCase() !== userId.toLowerCase());
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Error eliminando usuario local", e);
  }
}

// Solo funciona en modo local. Con Supabase real las claves se cambian en Authentication → Users.
export function updateUserPassword(userId: string, newPassword: string): boolean {
  if (getSupabaseConfig().isConfigured) {
    console.warn("Con Supabase real, cambie la contraseña desde Authentication → Users.");
    return false;
  }
  try {
    const users = getStoredUsers().map((u) => (u.id === userId ? { ...u, password: newPassword } : u));
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    return true;
  } catch {
    return false;
  }
}

// =========================================================================
// ALMACENAMIENTO LOCAL (respaldo / modo local)
// =========================================================================
function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error leyendo", key, e);
  }
  return fallback;
}
function writeLocal(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Error guardando", key, e);
  }
}

export const getStoredFinances = (): FinancialRecord[] => readLocal(STORAGE_FINANCES_KEY, defaultFinances);
export const saveStoredFinances = (d: FinancialRecord[]) => writeLocal(STORAGE_FINANCES_KEY, d);
export const getStoredAgenda = (): AgendaItem[] => readLocal(STORAGE_AGENDA_KEY, defaultAgenda);
export const saveStoredAgenda = (d: AgendaItem[]) => writeLocal(STORAGE_AGENDA_KEY, d);
export const getStoredHistory = (): HistoryItem[] => readLocal(STORAGE_HISTORY_KEY, defaultHistory);
export const saveStoredHistory = (d: HistoryItem[]) => writeLocal(STORAGE_HISTORY_KEY, d);
export const getStoredDocuments = (): DocumentItem[] => readLocal(STORAGE_DOCS_KEY, defaultDocuments);
export const saveStoredDocuments = (d: DocumentItem[]) => writeLocal(STORAGE_DOCS_KEY, d);
export const getStoredCases = (): CaseRecord[] => readLocal<CaseRecord[]>(STORAGE_CASES_LIST_KEY, []);
export const saveStoredCases = (d: CaseRecord[]) => writeLocal(STORAGE_CASES_LIST_KEY, d);

export function getStoredCase(): CaseRecord | null {
  const cases = getStoredCases();
  return cases.length > 0 ? cases[0] : null;
}

export function saveStoredCase(data: CaseRecord) {
  const cases = getStoredCases();
  const exists = cases.some((c) => c.id === data.id);
  saveStoredCases(exists ? cases.map((c) => (c.id === data.id ? data : c)) : [data, ...cases]);
}

export function deleteStoredCase(caseId: string) {
  saveStoredCases(getStoredCases().filter((c) => c.id !== caseId));
}

export function resetAllToDefault() {
  [STORAGE_CASE_KEY, STORAGE_CASES_LIST_KEY, STORAGE_AGENDA_KEY, STORAGE_HISTORY_KEY, STORAGE_DOCS_KEY, STORAGE_FINANCES_KEY].forEach(
    (k) => localStorage.removeItem(k)
  );
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_FIRM_ADMINS));
}

// =========================================================================
// SESIÓN SIMULADA (solo modo local)
// =========================================================================
export function createUserSession(user: StoredUser): Session {
  const role = FIRM_EMAILS.includes(user.email.toLowerCase()) ? "firm" : user.role;
  return {
    access_token: "jwt-token-" + Date.now(),
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "refresh-token-" + Date.now(),
    user: {
      id: user.id,
      aud: "authenticated",
      role: "authenticated",
      email: user.email,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {
        full_name: user.full_name,
        initials: user.initials,
        role,
        id_number: user.id_number,
        phone: user.phone,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  } as Session;
}

type AuthListener = (event: string, session: Session | null) => void;
const authListeners: Set<AuthListener> = new Set();

let currentMockSession: Session | null = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_SESSION_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
})();

function notifyAuthChange(event: string, session: Session | null) {
  currentMockSession = session;
  try {
    if (session) localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch {}
  authListeners.forEach((l) => l(event, session));
}

// =========================================================================
// CLIENTE MOCK (solo cuando NO hay credenciales de Supabase)
// =========================================================================
const mockSupabase = {
  auth: {
    async getSession() {
      return { data: { session: currentMockSession }, error: null };
    },
    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      await new Promise((r) => setTimeout(r, 200));
      const cleanEmail = email.trim().toLowerCase();
      const found = getStoredUsers().find((u) => u.email.toLowerCase() === cleanEmail);
      if (!found) {
        return { data: { session: null, user: null }, error: { message: "Usuario no registrado en el sistema." } };
      }
      if (password && found.password && found.password !== password) {
        return { data: { session: null, user: null }, error: { message: "Contraseña incorrecta." } };
      }
      const session = createUserSession(found);
      notifyAuthChange("SIGNED_IN", session);
      return { data: { session, user: session.user }, error: null };
    },
    async signOut() {
      notifyAuthChange("SIGNED_OUT", null);
      return { error: null };
    },
    onAuthStateChange(callback: AuthListener) {
      authListeners.add(callback);
      return { data: { subscription: { unsubscribe: () => authListeners.delete(callback) } } };
    },
  },

  from(table: string) {
    const ok = (data: any) => ({ data, error: null });
    return {
      select(_columns?: string) {
        let idFilter: string | null = null;
        let sortField = "event_date";
        let sortAsc = true;
        const chain: any = {
          eq(column: string, value: string) {
            if (column === "id") idFilter = value;
            return chain;
          },
          order(column: string, options?: { ascending: boolean }) {
            sortField = column;
            sortAsc = options?.ascending ?? true;
            return chain;
          },
          or() { return chain; },
          limit() { return chain; },
          single() { return chain.execute(); },
          maybeSingle() { return chain.execute(); },
          then(resolve: (v: any) => void) {
            return chain.execute().then(resolve);
          },
          async execute() {
            if (table === "profiles") {
              const meta = currentMockSession?.user?.user_metadata;
              const email = currentMockSession?.user?.email?.toLowerCase() || "";
              const role = FIRM_EMAILS.includes(email) ? "firm" : meta?.role || "client";
              return ok({
                id: idFilter || currentMockSession?.user?.id || "usr_current",
                full_name: meta?.full_name || "Usuario",
                initials: meta?.initials || "US",
                role,
                email,
                id_number: meta?.id_number || "",
                phone: meta?.phone || "",
              });
            }
            if (table === "cases") return ok(getStoredCase());
            const sorter = (a: any, b: any) => {
              const diff = new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime();
              return sortAsc ? diff : -diff;
            };
            if (table === "agenda_items") return ok([...getStoredAgenda()].sort(sorter));
            if (table === "history_items") return ok([...getStoredHistory()].sort(sorter));
            if (table === "documents") return ok(getStoredDocuments());
            if (table === "financial_records") return ok(getStoredFinances());
            return ok([]);
          },
        };
        return chain;
      },
      insert(values: any) {
        return { then: (resolve: (v: any) => void) => resolve(ok([values])) };
      },
      upsert(values: any) {
        return { then: (resolve: (v: any) => void) => resolve(ok([values])) };
      },
      delete() {
        const done = { then: (resolve: (v: any) => void) => resolve(ok(null)) };
        return { eq: () => done, in: () => done };
      },
    };
  },

  channel() {
    const ch: any = { on: () => ch, subscribe: () => ch };
    return ch;
  },
  removeChannel() {},
};

// =========================================================================
// CLIENTE REAL (singleton)
// =========================================================================
let realClient: any = null;
let realClientKey = "";

export function getRealSupabaseClient() {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) return mockSupabase as any;
  const key = cfg.url + "|" + cfg.anonKey;
  if (!realClient || realClientKey !== key) {
    realClient = createClient(cfg.url, cfg.anonKey);
    realClientKey = key;
  }
  return realClient;
}

export const supabase: any = getRealSupabaseClient();

// =========================================================================
// LOGIN
// =========================================================================
export async function loginWithCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; session?: Session; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data?.session) {
      const msg = error?.message || "";
      if (/invalid login credentials/i.test(msg)) {
        return { success: false, error: "Correo o contraseña incorrectos." };
      }
      if (/email not confirmed/i.test(msg)) {
        return { success: false, error: "El correo no está confirmado. Pida al administrador confirmarlo." };
      }
      return { success: false, error: msg || "No se pudo iniciar sesión." };
    }
    return { success: true, session: data.session };
  } catch (e: any) {
    return { success: false, error: e?.message || "Error al iniciar sesión." };
  }
}

// =========================================================================
// CASOS
// =========================================================================
export async function syncCaseToDatabase(caseRecord: CaseRecord) {
  saveStoredCase(caseRecord);
  if (!getSupabaseConfig().isConfigured) return;

  const row = pick(
    { ...caseRecord, city: caseRecord.city || "Bogotá D.C.", documents_count: (caseRecord as any).documents_count ?? 0, last_update: new Date().toISOString() },
    CASE_COLS
  );
  const { error } = await supabase.from("cases").upsert(row);
  if (error) {
    console.error("Error guardando caso en Supabase:", error.message);
    throw new Error(error.message);
  }
}

export async function fetchAllCasesFromDatabase(): Promise<CaseRecord[]> {
  if (getSupabaseConfig().isConfigured) {
    try {
      const { data, error } = await supabase.from("cases").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        saveStoredCases(data);
        return data; // aunque venga vacío: no "resucita" datos locales
      }
      if (error) console.error("Error cargando casos:", error.message);
    } catch (e) {
      console.warn("No se pudo consultar Supabase, usando datos locales", e);
    }
  }
  return getStoredCases();
}

export async function deleteCaseFromDatabase(caseId: string) {
  deleteStoredCase(caseId);
  if (!getSupabaseConfig().isConfigured) return;
  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) console.error("Error eliminando caso:", error.message);
}

// =========================================================================
// DOCUMENTOS
// =========================================================================
async function refreshDocumentsCount(caseId: string) {
  try {
    const { count } = await supabase.from("documents").select("id", { count: "exact", head: true }).eq("case_id", caseId);
    await supabase.from("cases").update({ documents_count: count ?? 0, last_update: new Date().toISOString() }).eq("id", caseId);
  } catch (e) {
    console.warn("No se pudo actualizar documents_count", e);
  }
}

export async function syncDocumentToDatabase(doc: DocumentItem) {
  // respaldo local
  const local = getStoredDocuments().filter((d) => d.id !== doc.id);
  saveStoredDocuments([doc, ...local]);

  if (!getSupabaseConfig().isConfigured) return;

  const row: any = pick(doc, DOC_COLS);

  // Los archivos base64 se suben a Storage en lugar de guardarse como texto en la tabla
  if (typeof row.download_url === "string" && row.download_url.startsWith("data:")) {
    const path = `${doc.case_id}/${doc.id}_${safeFileName(doc.name)}`;
    const blob = dataUrlToBlob(row.download_url);
    const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { upsert: true, contentType: blob.type });
    if (upErr) throw new Error("Storage: " + upErr.message);
    row.download_url = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("documents").upsert(row);
  if (error) throw new Error(error.message);
}

export async function deleteDocumentFromDatabase(docId: string) {
  saveStoredDocuments(getStoredDocuments().filter((d) => d.id !== docId));
  if (!getSupabaseConfig().isConfigured) return;
  const { error } = await supabase.from("documents").delete().eq("id", docId);
  if (error) throw new Error(error.message);
}

export async function fetchDocumentsForCaseFromDatabase(caseId: string): Promise<DocumentItem[]> {
  if (getSupabaseConfig().isConfigured) {
    const { data, error } = await supabase.from("documents").select("*").eq("case_id", caseId);
    if (!error && data) return data;
  }
  return getStoredDocuments().filter((d) => d.case_id === caseId);
}

export async function uploadDocumentToSupabaseStorage(
  caseId: string,
  file: File,
  finalName: string,
  category: string,
  status = "Oficial"
): Promise<{ success: boolean; message: string; storageUrl?: string; source: "supabase" | "local" }> {
  const id = generateUuid();
  const base = {
    id,
    case_id: caseId,
    name: finalName,
    category,
    file_size: formatFileSize(file.size),
    uploaded_at: new Date().toISOString(),
    status,
  };

  if (!getSupabaseConfig().isConfigured) {
    const dataUrl = await readAsDataUrl(file);
    saveStoredDocuments([{ ...base, download_url: dataUrl } as DocumentItem, ...getStoredDocuments()]);
    return { success: true, message: "Guardado localmente (Supabase no está configurado).", storageUrl: dataUrl, source: "local" };
  }

  try {
    const path = `${caseId}/${Date.now()}_${safeFileName(finalName)}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (upErr) return { success: false, message: "Storage: " + upErr.message, source: "supabase" };

    const url = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    const { error: dbErr } = await supabase.from("documents").upsert({ ...base, download_url: url });
    if (dbErr) return { success: false, message: "Base de datos: " + dbErr.message, source: "supabase" };

    await refreshDocumentsCount(caseId);
    return { success: true, message: "Documento guardado en Supabase Storage y asociado al expediente.", storageUrl: url, source: "supabase" };
  } catch (e: any) {
    return { success: false, message: e?.message || "Error al subir el documento.", source: "supabase" };
  }
}

// =========================================================================
// USUARIOS / PERFILES
// =========================================================================
export async function fetchProfilesOrUsers(): Promise<StoredUser[]> {
  if (getSupabaseConfig().isConfigured) {
    try {
      const { data, error } = await supabase.from("profiles").select("*");
      if (!error && data) {
        return data.map((p: any) => {
          const email = (p.email || "").toLowerCase();
          const name = p.full_name || (email === SUPER_ADMIN_EMAIL.toLowerCase() ? "David Pérez" : "Usuario");
          return {
            id: p.id,
            email: p.email || "",
            full_name: name,
            initials: p.initials || name.slice(0, 2).toUpperCase(),
            role: FIRM_EMAILS.includes(email) ? "firm" : p.role || "client",
            id_number: p.id_number,
            phone: p.phone,
            password: "",
            created_at: p.created_at,
          } as StoredUser;
        });
      }
    } catch (e) {
      console.warn("No se pudieron cargar perfiles", e);
    }
  }
  return getStoredUsers();
}

// Con Supabase real se usa la Edge Function "admin-users" (clave service_role en el servidor).
async function callAdminUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) {
    let detail = error.message;
    try {
      const j = await (error as any).context?.json?.();
      if (j?.error) detail = j.error;
    } catch {}
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function createUserAccount(
  userData: {
    email: string;
    password?: string;
    full_name: string;
    role: "client" | "firm";
    id_number?: string;
    phone?: string;
  },
  currentUser?: { email?: string | null; role?: string } | null
): Promise<{ success: boolean; user?: StoredUser; message?: string }> {
  if (currentUser !== undefined && !canCreateAccounts(currentUser)) {
    return { success: false, message: "No tiene permisos para crear cuentas." };
  }

  const cleanEmail = userData.email.trim().toLowerCase();
  const fullName = userData.full_name.trim();
  const role: "client" | "firm" = FIRM_EMAILS.includes(cleanEmail) ? "firm" : userData.role;
  const initials =
    fullName.split(" ").filter(Boolean).map((p) => p[0]).join("").toUpperCase().slice(0, 2) || "US";

  const newUser: StoredUser = {
    id: "usr_" + generateUuid().slice(0, 8),
    email: cleanEmail,
    password: userData.password || "Cliente2026*",
    full_name: fullName,
    initials,
    role,
    id_number: userData.id_number?.trim() || "",
    phone: userData.phone?.trim() || "",
    created_at: new Date().toISOString(),
  };

  if (getSupabaseConfig().isConfigured) {
    try {
      const res = await callAdminUsers({
        action: "create",
        email: cleanEmail,
        password: newUser.password,
        full_name: fullName,
        initials,
        role,
        id_number: newUser.id_number,
        phone: newUser.phone,
      });
      return { success: true, user: { ...newUser, id: res.id, password: "" }, message: "Usuario creado en Supabase." };
    } catch (e: any) {
      return {
        success: false,
        message:
          (e?.message || "Error") +
          " — Si la función no está desplegada, cree el usuario en Supabase → Authentication → Users → Add user.",
      };
    }
  }

  saveStoredUser(newUser);
  return { success: true, user: newUser, message: "Usuario creado localmente." };
}

export async function deleteUserAccount(userId: string, email: string): Promise<boolean> {
  if (FIRM_EMAILS.includes(email.toLowerCase())) {
    throw new Error("No se puede eliminar una cuenta de administrador de la firma.");
  }
  deleteStoredUser(userId);
  if (getSupabaseConfig().isConfigured) {
    await callAdminUsers({ action: "delete", id: userId });
  }
  return true;
}

// =========================================================================
// SINCRONIZACIÓN MASIVA LOCAL → SUPABASE
// =========================================================================
export async function syncAllLocalDataToSupabase(): Promise<{ success: boolean; message: string }> {
  if (!getSupabaseConfig().isConfigured) {
    return { success: false, message: "Supabase no está configurado." };
  }
  try {
    const cases = getStoredCases();
    const ids = new Set(cases.map((c) => c.id));
    const report: string[] = [];

    const run = async (table: string, rows: any[]) => {
      if (!rows.length) return;
      const { error } = await supabase.from(table).upsert(rows);
      if (error) throw new Error(`${table}: ${error.message}`);
      report.push(`${rows.length} ${table}`);
    };

    await run("cases", cases.map((c) => pick(c, CASE_COLS)));
    await run("agenda_items", getStoredAgenda().filter((a) => a.case_id && ids.has(a.case_id)).map((a) => pick(a, AGENDA_COLS)));
    await run("history_items", getStoredHistory().filter((h) => h.case_id && ids.has(h.case_id)).map((h) => pick(h, HISTORY_COLS)));

    const docs = getStoredDocuments().filter((d) => d.case_id && ids.has(d.case_id));
    for (const d of docs) await syncDocumentToDatabase(d);
    if (docs.length) report.push(`${docs.length} documents`);

    await run("financial_records", getStoredFinances().map((f) => pick(f, FIN_COLS)));

    return { success: true, message: report.length ? `Sincronizado: ${report.join(", ")}.` : "No había datos locales para sincronizar." };
  } catch (e: any) {
    return { success: false, message: e?.message || "Error al sincronizar." };
  }
}

// =========================================================================
// PRUEBA DE CONEXIÓN
// =========================================================================
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const cfg = getSupabaseConfig();
    const targetUrl = url || cfg.url;
    const targetKey = anonKey || cfg.anonKey;
    if (!targetUrl || !targetKey || !targetUrl.startsWith("https://")) {
      return { success: false, message: "URL o clave no válidas. La URL debe comenzar con https://" };
    }
    const testClient = createClient(targetUrl, targetKey);
    const { error } = await testClient.from("profiles").select("id", { count: "exact", head: true });
    if (error) {
      if (error.code === "42P01" || /does not exist|relation/i.test(error.message)) {
        return { success: true, message: "Conexión exitosa, pero las tablas aún no existen. Ejecute el script SQL en Supabase." };
      }
      return { success: false, message: `Error: ${error.message} (código ${error.code || "N/A"})` };
    }
    return { success: true, message: "Conexión a Supabase verificada. Recargue la página para aplicar los cambios." };
  } catch (e: any) {
    return { success: false, message: `Fallo de conexión: ${e?.message || String(e)}` };
  }
}
