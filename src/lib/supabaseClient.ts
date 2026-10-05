import { createClient, Session } from "@supabase/supabase-js";
import { defaultProfile, firmProfile, defaultCaseRecord, defaultAgenda, defaultHistory, defaultDocuments, defaultFinances } from "../data/initialData";
import { Profile, CaseRecord, AgendaItem, HistoryItem, DocumentItem, FinancialRecord } from "../types/portal";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifica si el usuario configuró credenciales reales de Supabase en .env
export const isConfiguredWithRealSupabase = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  supabaseAnonKey.length > 20
);

// Storage keys para persistencia de datos
const STORAGE_CASE_KEY = "ja_legal_case_data";
const STORAGE_AGENDA_KEY = "ja_legal_agenda_data";
const STORAGE_HISTORY_KEY = "ja_legal_history_data";
const STORAGE_DOCS_KEY = "ja_legal_docs_data";
const STORAGE_FINANCES_KEY = "ja_legal_finances_data";
const STORAGE_SESSION_KEY = "ja_legal_session";
const STORAGE_USERS_KEY = "ja_legal_registered_users";

export type StoredUser = {
  id: string;
  email: string;
  password: string;
  full_name: string;
  initials: string;
  role: "client" | "firm";
  id_number?: string;
  phone?: string;
};

// Cuentas predeterminadas para cuando no hay Supabase conectado
const INITIAL_SYSTEM_USERS: StoredUser[] = [
  {
    id: "usr_firm_01",
    email: "abogado@jalegal.com.co",
    password: "Abogado2026*",
    full_name: "Dra. Carolina Jiménez Ariza",
    initials: "CJ",
    role: "firm",
    id_number: "T.P. 182.904 del C.S.J.",
    phone: "+57 312 214 9562",
  },
  {
    id: "usr_demo_client_01",
    email: "cliente@jalegal.com.co",
    password: "Cliente2026*",
    full_name: "Dr. Roberto Mendoza Vargas",
    initials: "RM",
    role: "client",
    id_number: "C.C. 79.432.891 de Bogotá",
    phone: "+57 310 455 8920",
  },
];

export function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored users", e);
  }
  return INITIAL_SYSTEM_USERS;
}

export function saveStoredUser(user: StoredUser) {
  try {
    const users = getStoredUsers().filter((u) => u.email.toLowerCase() !== user.email.toLowerCase());
    users.push(user);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Error saving user", e);
  }
}

// Helpers para finanzas
export function getStoredFinances(): FinancialRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_FINANCES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored finances", e);
  }
  return defaultFinances;
}

export function saveStoredFinances(data: FinancialRecord[]) {
  try {
    localStorage.setItem(STORAGE_FINANCES_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Error saving finances", e);
  }
}

// Helpers para caso, agenda, historial y documentos
export function getStoredCase(): CaseRecord {
  try {
    const raw = localStorage.getItem(STORAGE_CASE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored case", e);
  }
  return defaultCaseRecord;
}

export function saveStoredCase(data: CaseRecord) {
  try {
    localStorage.setItem(STORAGE_CASE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Error saving case", e);
  }
}

export function getStoredAgenda(): AgendaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_AGENDA_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored agenda", e);
  }
  return defaultAgenda;
}

export function saveStoredAgenda(data: AgendaItem[]) {
  try {
    localStorage.setItem(STORAGE_AGENDA_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Error saving agenda", e);
  }
}

export function getStoredHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored history", e);
  }
  return defaultHistory;
}

export function saveStoredHistory(data: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Error saving history", e);
  }
}

export function getStoredDocuments(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_DOCS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored documents", e);
  }
  return defaultDocuments;
}

export function saveStoredDocuments(data: DocumentItem[]) {
  try {
    localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Error saving documents", e);
  }
}

export function resetAllToDefault() {
  localStorage.removeItem(STORAGE_CASE_KEY);
  localStorage.removeItem(STORAGE_AGENDA_KEY);
  localStorage.removeItem(STORAGE_HISTORY_KEY);
  localStorage.removeItem(STORAGE_DOCS_KEY);
  localStorage.removeItem(STORAGE_FINANCES_KEY);
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

// Generador de sesión tipada
export function createUserSession(user: StoredUser): Session {
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
        role: user.role,
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
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  // Sin login automático falso: se inicia en null para que pida credenciales
  return null;
})();

function notifyAuthChange(event: string, session: Session | null) {
  currentMockSession = session;
  try {
    if (session) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  } catch {}
  authListeners.forEach((listener) => listener(event, session));
}

// Cliente mock compatible con la API de Supabase para cuando aún no se conectan las llaves en .env
const mockSupabase = {
  auth: {
    async getSession() {
      return { data: { session: currentMockSession }, error: null };
    },
    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      await new Promise((res) => setTimeout(res, 250));
      const cleanEmail = email.trim().toLowerCase();
      const users = getStoredUsers();
      const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

      if (!found) {
        return {
          data: { session: null, user: null },
          error: { message: "No existe una cuenta con este correo electrónico. Verifique los datos o regístrese." },
        };
      }

      if (password && found.password && found.password !== password) {
        return {
          data: { session: null, user: null },
          error: { message: "Contraseña incorrecta. Por favor intente nuevamente." },
        };
      }

      const session = createUserSession(found);
      notifyAuthChange("SIGNED_IN", session);
      return { data: { session, user: session.user }, error: null };
    },
    async signUp({
      email,
      password,
      options,
    }: {
      email: string;
      password?: string;
      options?: { data?: { full_name?: string; role?: "client" | "firm"; id_number?: string; phone?: string } };
    }) {
      await new Promise((res) => setTimeout(res, 250));
      const cleanEmail = email.trim().toLowerCase();
      const users = getStoredUsers();
      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return {
          data: { session: null, user: null },
          error: { message: "Ya existe un usuario registrado con este correo electrónico." },
        };
      }

      const fullName = options?.data?.full_name || cleanEmail.split("@")[0];
      const initials = fullName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "JA";

      const newUser: StoredUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        email: cleanEmail,
        password: password || "123456",
        full_name: fullName,
        initials,
        role: options?.data?.role || "client",
        id_number: options?.data?.id_number || "",
        phone: options?.data?.phone || "",
      };

      saveStoredUser(newUser);
      const session = createUserSession(newUser);
      notifyAuthChange("SIGNED_IN", session);
      return { data: { session, user: session.user }, error: null };
    },
    async signOut() {
      notifyAuthChange("SIGNED_OUT", null);
      return { error: null };
    },
    onAuthStateChange(callback: AuthListener) {
      authListeners.add(callback);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
  },

  from(table: string) {
    return {
      select(_columns?: string) {
        let caseIdFilter: string | null = null;
        let clientIdFilter: string | null = null;
        let idFilter: string | null = null;
        let sortField = "event_date";
        let sortAsc = true;
        let isSingle = false;
        let isMaybeSingle = false;

        const chain = {
          eq(column: string, value: string) {
            if (column === "id") idFilter = value;
            if (column === "client_id") clientIdFilter = value;
            if (column === "case_id") caseIdFilter = value;
            return chain;
          },
          order(column: string, options?: { ascending: boolean }) {
            sortField = column;
            sortAsc = options?.ascending ?? true;
            return chain;
          },
          limit(_n: number) {
            return chain;
          },
          single() {
            isSingle = true;
            return chain.execute();
          },
          maybeSingle() {
            isMaybeSingle = true;
            return chain.execute();
          },
          async then(resolve: (value: { data: any; error: any }) => void) {
            const res = await chain.execute();
            resolve(res);
          },
          async execute() {
            let result: any = null;

            if (table === "profiles") {
              const currentId = idFilter || currentMockSession?.user?.id;
              const meta = currentMockSession?.user?.user_metadata;
              const userRole = meta?.role || "client";

              if (meta?.full_name) {
                result = {
                  id: currentMockSession?.user?.id || "usr_current",
                  full_name: meta.full_name,
                  initials: meta.initials || "JA",
                  role: userRole,
                  email: currentMockSession?.user?.email,
                  id_number: meta.id_number || (userRole === "firm" ? "T.P. 182.904 C.S.J." : "C.C. Registrada"),
                  phone: meta.phone || "",
                };
              } else if (userRole === "firm" || currentId === firmProfile.id) {
                result = firmProfile;
              } else {
                result = defaultProfile;
              }
              return { data: result, error: null };
            }

            if (table === "cases") {
              const currentCase = getStoredCase();
              result = currentCase;
              return { data: result, error: null };
            }

            if (table === "agenda_items") {
              let items = getStoredAgenda();
              if (caseIdFilter) {
                items = items.filter((i) => i.case_id === caseIdFilter || true);
              }
              items.sort((a, b) => {
                const diff = new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
                return sortAsc ? diff : -diff;
              });
              return { data: items, error: null };
            }

            if (table === "history_items") {
              let items = getStoredHistory();
              if (caseIdFilter) {
                items = items.filter((i) => i.case_id === caseIdFilter || true);
              }
              items.sort((a, b) => {
                const diff = new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
                return sortAsc ? diff : -diff;
              });
              return { data: items, error: null };
            }

            if (table === "documents") {
              let items = getStoredDocuments();
              return { data: items, error: null };
            }

            if (table === "financial_records") {
              let items = getStoredFinances();
              return { data: items, error: null };
            }

            return { data: [], error: null };
          },
        };

        return chain;
      },
      insert(values: any) {
        return {
          async then(resolve: (value: { data: any; error: any }) => void) {
            if (table === "financial_records") {
              const list = getStoredFinances();
              const newRecord = { ...values, id: values.id || "fin_" + Date.now() };
              list.unshift(newRecord);
              saveStoredFinances(list);
              resolve({ data: [newRecord], error: null });
              return;
            }
            resolve({ data: [values], error: null });
          },
        };
      },
      delete() {
        return {
          eq(column: string, value: string) {
            return {
              async then(resolve: (value: { data: any; error: any }) => void) {
                if (table === "financial_records" && column === "id") {
                  const filtered = getStoredFinances().filter((f) => f.id !== value);
                  saveStoredFinances(filtered);
                  resolve({ data: null, error: null });
                  return;
                }
                resolve({ data: null, error: null });
              },
            };
          },
        };
      },
    };
  },
};

// Exporta el cliente activo de Supabase (real si están puestas las variables en .env, o el local inteligente)
export const supabase = isConfiguredWithRealSupabase
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (mockSupabase as any);
