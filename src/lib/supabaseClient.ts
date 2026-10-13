import { createClient, Session } from "@supabase/supabase-js";
import { defaultProfile, defaultAgenda, defaultHistory, defaultDocuments, defaultFinances } from "../data/initialData";
import { Profile, CaseRecord, AgendaItem, HistoryItem, DocumentItem, FinancialRecord } from "../types/portal";

// Super Admin Titular definido por el usuario
export const SUPER_ADMIN_EMAIL = "eldavidprz@gmail.com";

// Claves de almacenamiento local
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

// Obtiene la configuración activa de Supabase (prioriza lo ingresado en la interfaz, luego variables de entorno)
export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  try {
    const savedUrl = localStorage.getItem(STORAGE_SUPABASE_URL_KEY) || "";
    const savedKey = localStorage.getItem(STORAGE_SUPABASE_ANON_KEY) || "";
    const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || "";

    const activeUrl = (savedUrl.trim() || envUrl.trim());
    const activeKey = (savedKey.trim() || envKey.trim());

    const isConfigured = Boolean(
      activeUrl &&
      activeKey &&
      activeUrl.startsWith("https://") &&
      activeKey.length > 20
    );

    return {
      url: activeUrl,
      anonKey: activeKey,
      isConfigured,
    };
  } catch {
    return { url: "", anonKey: "", isConfigured: false };
  }
}

const currentConfig = getSupabaseConfig();
export const isConfiguredWithRealSupabase = currentConfig.isConfigured;

// Guarda credenciales de Supabase desde la interfaz de usuario
export function saveSupabaseConfig(url: string, anonKey: string) {
  try {
    localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_SUPABASE_ANON_KEY, anonKey.trim());
  } catch (e) {
    console.warn("Error guardando credenciales de Supabase en localStorage", e);
  }
}

// Borra credenciales de Supabase guardadas
export function clearSupabaseConfig() {
  try {
    localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
    localStorage.removeItem(STORAGE_SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn("Error limpiando credenciales de Supabase", e);
  }
}

// ÚNICO Super Admin predeterminado configurado (se eliminaron las cuentas de prueba anteriores)
export const INITIAL_SUPERADMIN_USER: StoredUser = {
  id: "usr_superadmin_david",
  email: SUPER_ADMIN_EMAIL,
  password: "Admin2026*",
  full_name: "David Pérez",
  initials: "DP",
  role: "firm",
  id_number: "Super Admin Titular",
  phone: "+57 300 000 0000",
  created_at: new Date().toISOString(),
};

// Obtiene la lista de usuarios, eliminando cualquier cuenta demo antigua (abogado@ y cliente@)
export function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    let list: StoredUser[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filtra cualquier residuo de las cuentas demo anteriores
        list = parsed.filter(
          (u) =>
            u.email.toLowerCase() !== "abogado@jalegal.com.co" &&
            u.email.toLowerCase() !== "cliente@jalegal.com.co"
        );
      }
    }

    // Asegura que el Super Admin eldavidprz@gmail.com siempre esté presente como 'firm'
    const hasSuperAdmin = list.some(
      (u) => u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
    if (!hasSuperAdmin) {
      list.unshift(INITIAL_SUPERADMIN_USER);
    } else {
      // Garantizar que tenga rol 'firm'
      list = list.map((u) =>
        u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
          ? { ...u, role: "firm" as const }
          : u
      );
    }

    // Persistir lista limpia sin las cuentas viejas
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(list));
    return list;
  } catch (e) {
    console.warn("Error reading stored users", e);
    return [INITIAL_SUPERADMIN_USER];
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
    console.warn("Error saving user", e);
  }
}

export function deleteStoredUser(userId: string) {
  try {
    const users = getStoredUsers().filter(
      (u) => u.id !== userId && u.email.toLowerCase() !== userId.toLowerCase()
    );
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn("Error deleting user", e);
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

export function getStoredCases(): CaseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_CASES_LIST_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Error reading stored cases", e);
  }
  return [];
}

export function saveStoredCases(data: CaseRecord[]) {
  try {
    localStorage.setItem(STORAGE_CASES_LIST_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Error saving cases", e);
  }
}

export function getStoredCase(): CaseRecord | null {
  const cases = getStoredCases();
  return cases.length > 0 ? cases[0] : null;
}

export function saveStoredCase(data: CaseRecord) {
  const cases = getStoredCases();
  const index = cases.findIndex((c) => c.id === data.id);
  let updated: CaseRecord[];
  if (index >= 0) {
    updated = cases.map((c) => (c.id === data.id ? data : c));
  } else {
    updated = [data, ...cases];
  }
  saveStoredCases(updated);
}

export function deleteStoredCase(caseId: string) {
  const cases = getStoredCases();
  const updated = cases.filter((c) => c.id !== caseId);
  saveStoredCases(updated);
}

// Sincroniza el caso con la base de datos de Supabase si está conectada
export async function syncCaseToDatabase(caseRecord: CaseRecord) {
  saveStoredCase(caseRecord);
  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      await client.from("cases").upsert({
        id: caseRecord.id,
        client_id: caseRecord.client_id,
        client_email: caseRecord.client_email,
        client_name: caseRecord.client_name,
        radicado: caseRecord.radicado,
        title: caseRecord.title,
        process_type: caseRecord.process_type,
        status: caseRecord.status,
        progress: caseRecord.progress,
        balance: caseRecord.balance,
        total_fees: caseRecord.total_fees,
        authority: caseRecord.authority,
        city: caseRecord.city || "Bogotá D.C.",
        lawyer: caseRecord.lawyer,
        observations: caseRecord.observations,
        current_phase: caseRecord.current_phase,
        last_update: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Error syncing case to Supabase", e);
    }
  }
}

// Carga todos los casos desde Supabase PostgreSQL o desde almacenamiento local
export async function fetchAllCasesFromDatabase(): Promise<CaseRecord[]> {
  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      const { data, error } = await client.from("cases").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        saveStoredCases(data);
        return data;
      }
    } catch (e) {
      console.warn("Could not fetch cases from Supabase, using local", e);
    }
  }
  return getStoredCases();
}

// Elimina el caso de Supabase y de local storage
export async function deleteCaseFromDatabase(caseId: string) {
  deleteStoredCase(caseId);
  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      await client.from("cases").delete().eq("id", caseId);
    } catch (e) {
      console.warn("Error deleting case from Supabase", e);
    }
  }
}

// Obtiene los perfiles de Supabase o los usuarios registrados locales
export async function fetchProfilesOrUsers(): Promise<StoredUser[]> {
  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      const { data, error } = await client.from("profiles").select("*");
      if (!error && data && data.length > 0) {
        return data.map((p: any) => ({
          id: p.id,
          email: p.email || "",
          full_name: p.full_name || (p.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? "David Pérez" : "Usuario"),
          initials: p.initials || (p.full_name ? p.full_name.slice(0, 2).toUpperCase() : "US"),
          role: p.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? "firm" : (p.role || "client"),
          id_number: p.id_number,
          phone: p.phone,
          password: "",
          created_at: p.created_at,
        }));
      }
    } catch (e) {
      console.warn("Could not fetch profiles from Supabase, falling back to local users", e);
    }
  }
  return getStoredUsers();
}

// Crea una cuenta de usuario tanto en Supabase Auth + Profiles como localmente
export async function createUserAccount(userData: {
  email: string;
  password?: string;
  full_name: string;
  role: "client" | "firm";
  id_number?: string;
  phone?: string;
}): Promise<{ success: boolean; user?: StoredUser; message?: string }> {
  const cleanEmail = userData.email.trim().toLowerCase();
  const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
  const finalRole = isSuperAdmin ? "firm" : userData.role;

  const newUser: StoredUser = {
    id: "usr_" + Math.random().toString(36).substring(2, 9),
    email: cleanEmail,
    password: userData.password || "123456",
    full_name: userData.full_name.trim(),
    initials: userData.full_name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "US",
    role: finalRole,
    id_number: userData.id_number?.trim() || "",
    phone: userData.phone?.trim() || "",
    created_at: new Date().toISOString(),
  };

  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      const { data: signUpData, error: signUpError } = await client.auth.signUp({
        email: cleanEmail,
        password: userData.password || "Cliente2026*",
        options: {
          data: {
            full_name: newUser.full_name,
            role: newUser.role,
            id_number: newUser.id_number,
            phone: newUser.phone,
          },
        },
      });

      if (signUpError && !signUpError.message.includes("already registered")) {
        console.warn("Supabase auth signUp notice:", signUpError.message);
      }

      const assignedId = signUpData?.user?.id || newUser.id;
      newUser.id = assignedId;

      // Upsert en la tabla profiles para que se liste de inmediato
      await client.from("profiles").upsert({
        id: assignedId,
        email: cleanEmail,
        full_name: newUser.full_name,
        initials: newUser.initials,
        role: newUser.role,
        id_number: newUser.id_number,
        phone: newUser.phone,
      });
    } catch (e: any) {
      console.warn("Error creando usuario en Supabase", e);
    }
  }

  saveStoredUser(newUser);
  return { success: true, user: newUser, message: "Usuario creado exitosamente" };
}

// Elimina un usuario de Supabase y localmente
export async function deleteUserAccount(userId: string, email: string): Promise<boolean> {
  if (email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
    throw new Error("No se puede eliminar la cuenta del Super Admin titular (eldavidprz@gmail.com).");
  }

  deleteStoredUser(userId);

  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      await client.from("profiles").delete().eq("id", userId);
    } catch (e) {
      console.warn("Error eliminando perfil de Supabase", e);
    }
  }
  return true;
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
  localStorage.removeItem(STORAGE_CASES_LIST_KEY);
  localStorage.removeItem(STORAGE_AGENDA_KEY);
  localStorage.removeItem(STORAGE_HISTORY_KEY);
  localStorage.removeItem(STORAGE_DOCS_KEY);
  localStorage.removeItem(STORAGE_FINANCES_KEY);
  localStorage.removeItem(STORAGE_SESSION_KEY);
  // Restablecer usuarios solo dejando al Super Admin
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify([INITIAL_SUPERADMIN_USER]));
}

// Generador de sesión tipada
export function createUserSession(user: StoredUser): Session {
  const isSuperAdmin = user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  const role = isSuperAdmin ? "firm" : user.role;

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
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
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

// Cliente mock compatible con la API de Supabase para cuando aún no se conectan las credenciales
const mockSupabase = {
  auth: {
    async getSession() {
      return { data: { session: currentMockSession }, error: null };
    },
    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      await new Promise((res) => setTimeout(res, 200));
      const cleanEmail = email.trim().toLowerCase();
      const users = getStoredUsers();
      let found = users.find((u) => u.email.toLowerCase() === cleanEmail);

      // Si es el Super Admin eldavidprz@gmail.com y no existe aún, se inicializa
      if (!found && cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
        found = INITIAL_SUPERADMIN_USER;
        saveStoredUser(found);
      }

      if (!found) {
        return {
          data: { session: null, user: null },
          error: {
            message: "Usuario no registrado en el sistema. Verifique su correo o regístrese en la pestaña 'Crear Cuenta'.",
          },
        };
      }

      if (password && found.password && found.password !== password) {
        return {
          data: { session: null, user: null },
          error: { message: "Contraseña incorrecta. Por favor verifique e intente nuevamente." },
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
      await new Promise((res) => setTimeout(res, 200));
      const cleanEmail = email.trim().toLowerCase();
      const users = getStoredUsers();

      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return {
          data: { session: null, user: null },
          error: { message: "Ya existe un usuario registrado con este correo electrónico." },
        };
      }

      const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
      const fullName = options?.data?.full_name || (isSuperAdmin ? "David Pérez" : cleanEmail.split("@")[0]);
      const initials = fullName
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "US";

      const newUser: StoredUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        email: cleanEmail,
        password: password || "123456",
        full_name: fullName,
        initials,
        role: isSuperAdmin ? "firm" : (options?.data?.role || "client"),
        id_number: options?.data?.id_number || "",
        phone: options?.data?.phone || "",
        created_at: new Date().toISOString(),
      };

      saveStoredUser(newUser);
      const session = createUserSession(newUser);
      notifyAuthChange("SIGNED_IN", session);
      return { data: { session, user: session.user }, error: null };
    },
    async resetPasswordForEmail(email: string) {
      await new Promise((res) => setTimeout(res, 250));
      const cleanEmail = email.trim().toLowerCase();
      const users = getStoredUsers();
      const found = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!found && cleanEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
        return {
          data: null,
          error: { message: "No existe una cuenta registrada con este correo electrónico." },
        };
      }
      return { data: {}, error: null };
    },
    async updateUser(attributes: { password?: string; data?: any }) {
      await new Promise((res) => setTimeout(res, 200));
      if (currentMockSession?.user) {
        const users = getStoredUsers();
        const updated = users.map((u) => {
          if (u.id === currentMockSession?.user.id || u.email.toLowerCase() === currentMockSession?.user.email?.toLowerCase()) {
            return {
              ...u,
              password: attributes.password || u.password,
              full_name: attributes.data?.full_name || u.full_name,
            };
          }
          return u;
        });
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(updated));
      }
      return { data: { user: currentMockSession?.user }, error: null };
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
        let idFilter: string | null = null;
        let sortField = "event_date";
        let sortAsc = true;

        const chain = {
          eq(column: string, value: string) {
            if (column === "id") idFilter = value;
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
            return chain.execute();
          },
          maybeSingle() {
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
              const userEmail = currentMockSession?.user?.email?.toLowerCase();
              const isSuper = userEmail === SUPER_ADMIN_EMAIL.toLowerCase();
              const userRole = isSuper ? "firm" : (meta?.role || "client");

              result = {
                id: currentId || "usr_current",
                full_name: isSuper ? "David Pérez" : (meta?.full_name || "Usuario"),
                initials: isSuper ? "DP" : (meta?.initials || "US"),
                role: userRole,
                email: currentMockSession?.user?.email,
                id_number: meta?.id_number || (userRole === "firm" ? "Super Admin Titular" : "C.C. Registrada"),
                phone: meta?.phone || "",
              };
              return { data: result, error: null };
            }

            if (table === "cases") {
              const currentCase = getStoredCase();
              return { data: currentCase, error: null };
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
              return { data: getStoredDocuments(), error: null };
            }

            if (table === "financial_records") {
              return { data: getStoredFinances(), error: null };
            }

            return { data: [], error: null };
          },
        };

        return chain;
      },
      insert(values: any) {
        return {
          async then(resolve: (value: { data: any; error: any }) => void) {
            resolve({ data: [values], error: null });
          },
        };
      },
      upsert(values: any) {
        return {
          async then(resolve: (value: { data: any; error: any }) => void) {
            resolve({ data: [values], error: null });
          },
        };
      },
      delete() {
        return {
          eq(_column: string, _value: string) {
            return {
              async then(resolve: (value: { data: any; error: any }) => void) {
                resolve({ data: null, error: null });
              },
            };
          },
        };
      },
    };
  },
};

// Singleton del cliente real de Supabase
let realSupabaseClientInstance: any = null;

export function getRealSupabaseClient() {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) {
    return mockSupabase as any;
  }
  if (!realSupabaseClientInstance) {
    realSupabaseClientInstance = createClient(cfg.url, cfg.anonKey);
  }
  return realSupabaseClientInstance;
}

// Prueba en tiempo real la conexión con Supabase
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string }> {
  try {
    const targetUrl = url || getSupabaseConfig().url;
    const targetKey = anonKey || getSupabaseConfig().anonKey;

    if (!targetUrl || !targetKey || !targetUrl.startsWith("https://")) {
      return {
        success: false,
        message: "URL o Anon Key no válidos. La URL debe comenzar con https://",
      };
    }

    const testClient = createClient(targetUrl, targetKey);
    // Probamos haciendo un select mínimo a la tabla profiles o auth
    const { error } = await testClient.from("profiles").select("count", { count: "exact", head: true });

    if (error) {
      // Si la tabla profiles no existe aún pero la API respondió
      if (error.code === "42P01" || error.message.includes("relation") || error.message.includes("does not exist")) {
        return {
          success: true,
          message: "¡Conexión a Supabase exitosa! Nota: Las tablas aún no están creadas. Copia y ejecuta el script SQL abajo en el SQL Editor de Supabase.",
        };
      }
      return {
        success: false,
        message: `Error al conectar con Supabase: ${error.message} (Código: ${error.code || "N/A"})`,
      };
    }

    return {
      success: true,
      message: "¡Conexión a Supabase 100% activa y verificada! Tablas disponibles.",
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Fallo de conexión de red o credencial inválida: ${err.message || String(err)}`,
    };
  }
}

// Exporta el cliente activo de Supabase
export const supabase = getSupabaseConfig().isConfigured
  ? getRealSupabaseClient()
  : (mockSupabase as any);

// Script SQL completo para que el usuario configure las tablas en Supabase con 1 clic
export const SUPABASE_SQL_SETUP_SCRIPT = `-- =========================================================================
-- ESQUEMA COMPLETO Y LISTO PARA EJECUTAR EN SUPABASE (J&A LEGAL)
-- Instrucciones:
-- 1. Ve a tu panel en https://supabase.com/dashboard
-- 2. Entra a tu proyecto -> SQL Editor -> New Query
-- 3. Pega todo este código y haz clic en "Run" (Ejecutar)
-- =========================================================================

-- 1. TABLA DE PERFILES DE USUARIO (Vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  initials TEXT,
  role TEXT DEFAULT 'client',
  id_number TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla public.profiles ya existía previamente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS initials TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2. TABLA DE EXPEDIENTES / PROCESOS JUDICIALES
CREATE TABLE IF NOT EXISTS public.cases (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  client_email TEXT,
  client_name TEXT,
  radicado TEXT,
  title TEXT NOT NULL,
  process_type TEXT NOT NULL,
  status TEXT DEFAULT 'Activo',
  progress INTEGER DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  total_fees NUMERIC DEFAULT 0,
  authority TEXT,
  city TEXT DEFAULT 'Bogotá D.C.',
  lawyer TEXT,
  observations TEXT,
  current_phase TEXT,
  last_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas en cases por si ya existía
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS radicado TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS process_type TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Activo';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS total_fees NUMERIC DEFAULT 0;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS authority TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Bogotá D.C.';
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS lawyer TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS observations TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS current_phase TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS last_update TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 3. TABLA DE AGENDA Y VENCIMIENTOS
CREATE TABLE IF NOT EXISTS public.agenda_items (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  event_time TEXT,
  title TEXT NOT NULL,
  detail TEXT,
  type TEXT,
  location TEXT,
  virtual_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS case_id TEXT;
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS event_time TEXT;
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS detail TEXT;
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS virtual_link TEXT;
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. TABLA DE HISTORIAL PROCESAL / ACTUACIONES
CREATE TABLE IF NOT EXISTS public.history_items (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  event_date TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  note TEXT,
  stage TEXT,
  is_milestone BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.history_items ADD COLUMN IF NOT EXISTS case_id TEXT;
ALTER TABLE public.history_items ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE public.history_items ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.history_items ADD COLUMN IF NOT EXISTS detail TEXT;
ALTER TABLE public.history_items ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.history_items ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE public.history_items ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT FALSE;
ALTER TABLE public.history_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 5. TABLA DE DOCUMENTOS DEL EXPEDIENTE DIGITAL
CREATE TABLE IF NOT EXISTS public.documents (
  id TEXT PRIMARY KEY,
  case_id TEXT REFERENCES public.cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  file_size TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  download_url TEXT,
  status TEXT DEFAULT 'Oficial',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS case_id TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_size TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS download_url TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Oficial';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 6. TABLA DE CONTROL FINANCIERO Y HONORARIOS
CREATE TABLE IF NOT EXISTS public.financial_records (
  id TEXT PRIMARY KEY,
  case_id TEXT,
  client_id TEXT,
  client_name TEXT,
  type TEXT CHECK (type IN ('ingreso', 'egreso')),
  category TEXT NOT NULL,
  concept TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  date TEXT,
  status TEXT DEFAULT 'completado',
  payment_method TEXT,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS case_id TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS client_id TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS concept TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completado';
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.financial_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 7. FUNCIÓN Y TRIGGER: CREAR PERFIL AUTOMÁTICO AL REGISTRARSE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, initials, role, id_number, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    UPPER(SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)), 1, 2)),
    CASE WHEN LOWER(NEW.email) = 'eldavidprz@gmail.com' THEN 'firm' ELSE COALESCE(NEW.raw_user_meta_data->>'role', 'client') END,
    COALESCE(NEW.raw_user_meta_data->>'id_number', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = CASE WHEN LOWER(NEW.email) = 'eldavidprz@gmail.com' THEN 'firm' ELSE EXCLUDED.role END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. POLÍTICAS DE SEGURIDAD (RLS) HABILITADAS Y PERMISIVAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso total profiles" ON public.profiles;
CREATE POLICY "Acceso total profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total cases" ON public.cases;
CREATE POLICY "Acceso total cases" ON public.cases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total agenda" ON public.agenda_items;
CREATE POLICY "Acceso total agenda" ON public.agenda_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total history" ON public.history_items;
CREATE POLICY "Acceso total history" ON public.history_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total documents" ON public.documents;
CREATE POLICY "Acceso total documents" ON public.documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso total finances" ON public.financial_records;
CREATE POLICY "Acceso total finances" ON public.financial_records FOR ALL USING (true) WITH CHECK (true);

-- 9. SINCRONIZAR USUARIOS YA REGISTRADOS EN AUTH.USERS (Por si creaste tu cuenta antes de este script)
INSERT INTO public.profiles (id, email, full_name, initials, role, id_number, phone)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1), 'Usuario'),
  UPPER(SUBSTRING(COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1), 'US'), 1, 2)),
  CASE WHEN LOWER(email) = 'eldavidprz@gmail.com' THEN 'firm' ELSE COALESCE(raw_user_meta_data->>'role', 'client') END,
  COALESCE(raw_user_meta_data->>'id_number', ''),
  COALESCE(raw_user_meta_data->>'phone', '')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = CASE WHEN LOWER(EXCLUDED.email) = 'eldavidprz@gmail.com' THEN 'firm' ELSE public.profiles.role END;

-- 10. ASEGURAR PRIVILEGIOS DE SUPER ADMINISTRADOR PARA ELDAVIDPRZ@GMAIL.COM
UPDATE public.profiles
SET role = 'firm'
WHERE LOWER(email) = 'eldavidprz@gmail.com';
`;
