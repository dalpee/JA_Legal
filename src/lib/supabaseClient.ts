import { createClient, Session } from "@supabase/supabase-js";
import { defaultProfile, firmProfile, defaultCaseRecord, defaultAgenda, defaultHistory, defaultDocuments } from "../data/initialData";
import { Profile, CaseRecord, AgendaItem, HistoryItem, DocumentItem } from "../types/portal";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if user provided valid remote supabase credentials
export const isConfiguredWithRealSupabase = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith("https://") &&
  supabaseAnonKey.length > 20
);

// Storage keys
const STORAGE_CASE_KEY = "ja_legal_case_data";
const STORAGE_AGENDA_KEY = "ja_legal_agenda_data";
const STORAGE_HISTORY_KEY = "ja_legal_history_data";
const STORAGE_DOCS_KEY = "ja_legal_docs_data";
const STORAGE_SESSION_KEY = "ja_legal_session";

// Helpers to read/write simulated database state
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
  localStorage.removeItem(STORAGE_SESSION_KEY);
}

// Simulated session generator
export function createMockSession(role: "client" | "firm"): Session {
  const profile = role === "client" ? defaultProfile : firmProfile;
  return {
    access_token: "mock-jwt-token-" + Date.now(),
    token_type: "bearer",
    expires_in: 3600,
    refresh_token: "mock-refresh-token",
    user: {
      id: profile.id,
      aud: "authenticated",
      role: "authenticated",
      email: profile.email || "demo@jalegal.com.co",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: { full_name: profile.full_name, initials: profile.initials, role },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  } as Session;
}

// Memory listeners for auth changes
type AuthListener = (event: string, session: Session | null) => void;
const authListeners: Set<AuthListener> = new Set();

let currentMockSession: Session | null = (() => {
  try {
    const stored = localStorage.getItem(STORAGE_SESSION_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // fallback
  }
  // Default to pre-authenticated client demo session so user immediately sees their working portal!
  const initial = createMockSession("client");
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(initial));
  } catch {}
  return initial;
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

// Mock Supabase implementation that matches Supabase's JS SDK API
const mockSupabase = {
  auth: {
    async getSession() {
      return { data: { session: currentMockSession }, error: null };
    },
    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      await new Promise((res) => setTimeout(res, 200));
      if (!email) {
        return { data: { session: null, user: null }, error: { message: "Correo inválido" } };
      }
      const isFirm = email.toLowerCase().includes("abogado") || email.toLowerCase().includes("firma") || email.toLowerCase().includes("cjimenez");
      const session = createMockSession(isFirm ? "firm" : "client");
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
              if (currentId === firmProfile.id || currentMockSession?.user?.user_metadata?.role === "firm") {
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

            return { data: [], error: null };
          },
        };

        return chain;
      },
    };
  },
};

// Export active supabase client (real or local simulator)
export const supabase = isConfiguredWithRealSupabase
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (mockSupabase as any);

export function switchUserSession(role: "client" | "firm") {
  const session = createMockSession(role);
  notifyAuthChange("USER_SWITCHED", session);
  return session;
}
