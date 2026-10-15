import { createClient, Session } from "@supabase/supabase-js";
import { defaultProfile, defaultAgenda, defaultHistory, defaultDocuments, defaultFinances } from "../data/initialData";
import { Profile, CaseRecord, AgendaItem, HistoryItem, DocumentItem, FinancialRecord } from "../types/portal";

// Super Admin Titular definido por el usuario
export const SUPER_ADMIN_EMAIL = "eldavidprz@gmail.com";

// Los 2 Administradores Socios de la firma autorizados
export const ADMIN_1_EMAIL = "marlon.jimenez@jalegal.com.co";
export const ADMIN_2_EMAIL = "sebastian.ariza@jalegal.com.co";

// Lista exclusiva de administradores que pueden crear y gestionar cuentas en el sistema
export const AUTHORIZED_CREATOR_EMAILS = [
  SUPER_ADMIN_EMAIL.toLowerCase(),
  ADMIN_1_EMAIL.toLowerCase(),
  ADMIN_2_EMAIL.toLowerCase(),
  "contacto@jalegal.com.co",
];

// Valida si un usuario tiene permisos estrictos para crear nuevas cuentas en el sistema
// Regla: Únicamente el Super Admin (eldavidprz@gmail.com) y los 2 Administradores
export function canCreateAccounts(user?: { email?: string | null; role?: string } | null): boolean {
  if (!user || !user.email) return false;
  const email = user.email.toLowerCase().trim();
  return AUTHORIZED_CREATOR_EMAILS.includes(email);
}

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

// Genera un UUID v4 válido compatible con PostgreSQL tipo UUID
export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

export const isConfiguredWithRealSupabase = getSupabaseConfig().isConfigured;

// Guarda credenciales de Supabase desde la interfaz de usuario y reinicia el cliente
export function saveSupabaseConfig(url: string, anonKey: string) {
  try {
    localStorage.setItem(STORAGE_SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_SUPABASE_ANON_KEY, anonKey.trim());
    resetRealClientInstance();
  } catch (e) {
    console.warn("Error guardando credenciales de Supabase en localStorage", e);
  }
}

// Borra credenciales de Supabase guardadas
export function clearSupabaseConfig() {
  try {
    localStorage.removeItem(STORAGE_SUPABASE_URL_KEY);
    localStorage.removeItem(STORAGE_SUPABASE_ANON_KEY);
    resetRealClientInstance();
  } catch (e) {
    console.warn("Error limpiando credenciales de Supabase", e);
  }
}

// ÚNICO Super Admin predeterminado configurado
export const INITIAL_SUPERADMIN_USER: StoredUser = {
  id: "00000000-0000-4000-a000-000000000001",
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
      // Garantizar que tenga rol 'firm' y contraseña 'Admin2026*'
      list = list.map((u) =>
        u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
          ? { ...u, role: "firm" as const, password: "Admin2026*" }
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
// Solo el Super Admin titular o Administradores autorizados pueden ejecutar esta acción
export async function createUserAccount(
  userData: {
    email: string;
    password?: string;
    full_name: string;
    role: "client" | "firm";
    id_number?: string;
    phone?: string;
  },
  currentAuthUser?: { email?: string | null; role?: string } | null
): Promise<{ success: boolean; user?: StoredUser; message?: string }> {
  // Validación estricta: Solo Super Admin y Administradores pueden crear cuentas
  if (currentAuthUser && !canCreateAccounts(currentAuthUser)) {
    throw new Error("Acceso denegado: Únicamente el Super Admin y los administradores autorizados pueden crear cuentas.");
  }

  const cleanEmail = userData.email.trim().toLowerCase();
  const isSuperAdmin = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
  const finalRole = isSuperAdmin ? "firm" : userData.role;

  // Genera un UUID v4 formal para compatibilidad estricta con PostgreSQL UUID
  const generatedId = generateUuid();

  const newUser: StoredUser = {
    id: generatedId,
    email: cleanEmail,
    password: userData.password || "Cliente2026*",
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

      // 1. Verificar si ya existe en profiles para reusar su ID
      const { data: existingProfile } = await client
        .from("profiles")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existingProfile?.id) {
        newUser.id = existingProfile.id;
      }

      // 2. Intentar registrar en Supabase Auth (crea usuario y credenciales)
      try {
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

        if (signUpData?.user?.id) {
          newUser.id = signUpData.user.id;
        }

        if (signUpError && !signUpError.message.includes("already registered")) {
          console.warn("Supabase auth signUp notice:", signUpError.message);
        }
      } catch (authErr) {
        console.warn("Notice during auth.signUp:", authErr);
      }

      // 3. Upsert SIEMPRE en la tabla profiles de Supabase para que se refleje de inmediato
      const { error: profileUpsertError } = await client.from("profiles").upsert({
        id: newUser.id,
        email: cleanEmail,
        full_name: newUser.full_name,
        initials: newUser.initials,
        role: newUser.role,
        id_number: newUser.id_number,
        phone: newUser.phone,
      });

      if (profileUpsertError) {
        console.warn("Aviso upsert profile en Supabase:", profileUpsertError.message);
      }
    } catch (e: any) {
      console.warn("Error creando usuario en Supabase", e);
    }
  }

  saveStoredUser(newUser);
  return { success: true, user: newUser, message: "Usuario creado y registrado exitosamente" };
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

// Sincroniza un documento tanto en el almacenamiento local como en la tabla public.documents de Supabase
export async function syncDocumentToDatabase(doc: DocumentItem) {
  const allDocs = getStoredDocuments();
  const index = allDocs.findIndex((d) => d.id === doc.id);
  let updatedDocs: DocumentItem[];
  if (index >= 0) {
    updatedDocs = allDocs.map((d) => (d.id === doc.id ? doc : d));
  } else {
    updatedDocs = [doc, ...allDocs];
  }
  saveStoredDocuments(updatedDocs);

  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      await client.from("documents").upsert({
        id: doc.id,
        case_id: doc.case_id,
        name: doc.name,
        category: doc.category,
        file_size: doc.file_size,
        uploaded_at: doc.uploaded_at || new Date().toISOString(),
        download_url: doc.download_url || null,
        status: doc.status || "Oficial",
      });
    } catch (e) {
      console.warn("Error sincronizando documento con Supabase", e);
    }
  }
}

// Elimina un documento de Supabase y localmente
export async function deleteDocumentFromDatabase(docId: string) {
  const allDocs = getStoredDocuments();
  saveStoredDocuments(allDocs.filter((d) => d.id !== docId));

  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      await client.from("documents").delete().eq("id", docId);
    } catch (e) {
      console.warn("Error eliminando documento de Supabase", e);
    }
  }
}

// Carga los documentos de un caso desde Supabase si está disponible
export async function fetchDocumentsForCaseFromDatabase(caseId: string): Promise<DocumentItem[]> {
  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      const { data, error } = await client
        .from("documents")
        .select("*")
        .eq("case_id", caseId)
        .order("uploaded_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as DocumentItem[];
      }
    } catch (e) {
      console.warn("Could not fetch documents from Supabase", e);
    }
  }
  return getStoredDocuments().filter((d) => !d.case_id || d.case_id === caseId);
}

// Sube un documento al bucket 'case-documents' de Supabase Storage e incorpora su registro
export async function uploadDocumentToSupabaseStorage(
  caseId: string,
  file: File | Blob,
  fileName: string,
  category: string = "Auto / Providencia",
  status: string = "Oficial"
): Promise<{
  success: boolean;
  document: DocumentItem;
  storageUrl?: string;
  source: "supabase_storage" | "data_url";
  message: string;
}> {
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${caseId}/${Date.now()}_${cleanFileName}`;
  const fileSizeMb = (file.size / (1024 * 1024)).toFixed(2);
  const formattedSize = `${fileSizeMb} MB`;

  let downloadUrl: string | undefined = undefined;
  let uploadSource: "supabase_storage" | "data_url" = "data_url";
  let uploadMessage = "Documento incorporado exitosamente.";

  const cfg = getSupabaseConfig();
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();

      // 1. Intentar subir al bucket 'case-documents' en Supabase Storage
      const { data: uploadData, error: uploadError } = await client.storage
        .from("case-documents")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!uploadError && uploadData?.path) {
        const { data: publicUrlData } = client.storage
          .from("case-documents")
          .getPublicUrl(uploadData.path);

        if (publicUrlData?.publicUrl) {
          downloadUrl = publicUrlData.publicUrl;
          uploadSource = "supabase_storage";
          uploadMessage = "Documento subido a Supabase Storage con éxito.";
        }
      } else if (uploadError) {
        console.warn("Aviso de Supabase Storage upload:", uploadError.message);
      }
    } catch (e: any) {
      console.warn("Excepción al subir a Supabase Storage:", e);
    }
  }

  // 2. Si no se obtuvo URL de Supabase Storage (o en modo local), crear DataURL de respaldo
  if (!downloadUrl) {
    try {
      downloadUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
      if (uploadSource === "data_url") {
        uploadMessage = cfg.isConfigured
          ? "Documento registrado en la base de datos de Supabase. (Nota: Para almacenamiento nativo de archivos, asegúrate de tener el bucket 'case-documents' creado en Supabase Storage)."
          : "Documento guardado localmente de forma segura.";
      }
    } catch (err) {
      console.warn("FileReader error:", err);
    }
  }

  // 3. Crear el DocumentItem formal
  const newDoc: DocumentItem = {
    id: "doc_" + Date.now(),
    case_id: caseId,
    name: fileName,
    category,
    file_size: formattedSize,
    uploaded_at: new Date().toISOString().split("T")[0],
    download_url: downloadUrl || undefined,
    status,
  };

  // 4. Sincronizar en la tabla 'documents' de Supabase y en localStorage
  await syncDocumentToDatabase(newDoc);

  // 5. Actualizar el conteo de documentos en el caso correspondiente
  const allCases = getStoredCases();
  const targetCase = allCases.find((c) => c.id === caseId);
  if (targetCase) {
    const updatedCase: CaseRecord = {
      ...targetCase,
      documents_count: (targetCase.documents_count || 0) + 1,
    };
    saveStoredCase(updatedCase);
    if (cfg.isConfigured) {
      try {
        const client = getRealSupabaseClient();
        await client
          .from("cases")
          .update({
            documents_count: updatedCase.documents_count,
            last_update: new Date().toISOString(),
          })
          .eq("id", caseId);
      } catch (e) {
        console.warn("Error updating case documents count in Supabase:", e);
      }
    }
  }

  return {
    success: true,
    document: newDoc,
    storageUrl: downloadUrl,
    source: uploadSource,
    message: uploadMessage,
  };
}

// Sincroniza todos los datos locales (casos, perfiles, documentos) directamente a Supabase
export async function syncAllLocalDataToSupabase(): Promise<{
  success: boolean;
  casesCount: number;
  usersCount: number;
  docsCount: number;
  message: string;
}> {
  const cfg = getSupabaseConfig();
  if (!cfg.isConfigured) {
    throw new Error("Supabase no está configurado aún. Ingrese la URL y la Anon Key primero.");
  }
  const client = getRealSupabaseClient();
  let usersCount = 0;
  let casesCount = 0;
  let docsCount = 0;

  // 1. Sincronizar perfiles / usuarios
  const localUsers = getStoredUsers();
  for (const u of localUsers) {
    try {
      await client.from("profiles").upsert({
        id: u.id,
        email: u.email.toLowerCase().trim(),
        full_name: u.full_name,
        initials: u.initials,
        role: u.role,
        id_number: u.id_number || "",
        phone: u.phone || "",
      });
      usersCount++;
    } catch (e) {
      console.warn("Error sincronizando usuario a Supabase:", u.email, e);
    }
  }

  // 2. Sincronizar casos
  const localCases = getStoredCases();
  for (const c of localCases) {
    try {
      await client.from("cases").upsert({
        id: c.id,
        client_id: c.client_id || null,
        client_email: c.client_email ? c.client_email.toLowerCase().trim() : null,
        client_name: c.client_name || null,
        radicado: c.radicado || null,
        title: c.title,
        process_type: c.process_type,
        status: c.status || "Activo",
        progress: c.progress || 0,
        balance: c.balance || 0,
        total_fees: c.total_fees || 0,
        authority: c.authority || null,
        city: c.city || "Bogotá D.C.",
        lawyer: c.lawyer || null,
        observations: c.observations || null,
        current_phase: c.current_phase || null,
      });
      casesCount++;
    } catch (e) {
      console.warn("Error sincronizando caso a Supabase:", c.id, e);
    }
  }

  // 3. Sincronizar documentos
  const localDocs = getStoredDocuments();
  for (const d of localDocs) {
    try {
      await client.from("documents").upsert({
        id: d.id,
        case_id: d.case_id,
        name: d.name,
        category: d.category,
        file_size: d.file_size,
        uploaded_at: d.uploaded_at || new Date().toISOString(),
        download_url: d.download_url || null,
        status: d.status || "Oficial",
      });
      docsCount++;
    } catch (e) {
      console.warn("Error sincronizando documento a Supabase:", d.id, e);
    }
  }

  return {
    success: true,
    casesCount,
    usersCount,
    docsCount,
    message: `¡Sincronización con Supabase exitosa! Se guardaron ${casesCount} procesos, ${usersCount} usuarios y ${docsCount} documentos directamente en tu base de datos.`,
  };
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

// Función centralizada y blindada para autenticación con Supabase y modo local
export async function loginWithCredentials(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; session?: Session; error?: string }> {
  await new Promise((res) => setTimeout(res, 180));
  const cleanEmail = (emailInput || "").trim().toLowerCase();
  const rawPassword = (passwordInput || "").trim();

  if (!cleanEmail) {
    return { success: false, error: "Por favor ingrese su correo electrónico." };
  }
  if (!rawPassword) {
    return { success: false, error: "Por favor ingrese su contraseña." };
  }

  const isSuperAdminEmail = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
  // Acepta Admin2026* con o sin mayúscula para evitar bloqueos por teclado móvil
  const isSuperAdminPassword =
    rawPassword === "Admin2026*" ||
    rawPassword.toLowerCase() === "admin2026*" ||
    rawPassword.toLowerCase() === "admin2026";

  const cfg = getSupabaseConfig();

  // =========================================================================
  // CASO 1: SUPER ADMINISTRADOR TITULAR (David Pérez - eldavidprz@gmail.com)
  // =========================================================================
  if (isSuperAdminEmail) {
    if (!isSuperAdminPassword) {
      return {
        success: false,
        error: "Contraseña incorrecta para el Super Admin. La clave maestra es: Admin2026* (A mayúscula y asterisco al final).",
      };
    }

    // Si Supabase está conectado, intentamos autenticación o registro en Supabase Auth
    if (cfg.isConfigured) {
      try {
        const client = getRealSupabaseClient();
        
        // 1. Intentar iniciar sesión real en Supabase Auth
        const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: "Admin2026*",
        });

        if (!signInError && signInData?.session) {
          notifyAuthChange("SIGNED_IN", signInData.session);
          return { success: true, session: signInData.session };
        }

        // 2. Si no existe en Supabase Auth, registrarlo en caliente
        try {
          const { data: signUpData } = await client.auth.signUp({
            email: cleanEmail,
            password: "Admin2026*",
            options: {
              data: {
                full_name: "David Pérez",
                role: "firm",
                id_number: "Super Admin Titular",
                phone: "+57 300 000 0000",
              },
            },
          });
          if (signUpData?.session) {
            notifyAuthChange("SIGNED_IN", signUpData.session);
            return { success: true, session: signUpData.session };
          }
        } catch (signupErr) {
          console.warn("Aviso auto-registro Super Admin en Supabase:", signupErr);
        }

        // 3. Asegurar que exista en la tabla public.profiles de Supabase
        try {
          await client.from("profiles").upsert({
            id: INITIAL_SUPERADMIN_USER.id,
            email: cleanEmail,
            full_name: "David Pérez",
            initials: "DP",
            role: "firm",
            id_number: "Super Admin Titular",
            phone: "+57 300 000 0000",
          });
        } catch (profileErr) {
          console.warn("Aviso upsert profile Super Admin:", profileErr);
        }
      } catch (err) {
        console.warn("Aviso conectando Super Admin a Supabase remoto:", err);
      }
    }

    // 4. Si Supabase no está conectado o el correo requería confirmación de email:
    // El Super Admin NUNCA queda bloqueado de su propia plataforma.
    const superSession = createUserSession(INITIAL_SUPERADMIN_USER);
    notifyAuthChange("SIGNED_IN", superSession);
    return { success: true, session: superSession };
  }

  // =========================================================================
  // CASO 2: USUARIOS GENERALES (Abogados Socios y Clientes)
  // =========================================================================
  if (cfg.isConfigured) {
    try {
      const client = getRealSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: rawPassword,
      });

      if (!error && data?.session) {
        notifyAuthChange("SIGNED_IN", data.session);
        return { success: true, session: data.session };
      }

      if (error) {
        let msg = error.message;
        const lower = msg.toLowerCase();
        if (lower.includes("invalid login credentials")) {
          msg = "Credenciales incorrectas o usuario no registrado en Supabase. Verifique su correo y clave.";
        } else if (lower.includes("email not confirmed")) {
          msg = "Correo pendiente de confirmación en Supabase. En su panel de Supabase -> Authentication -> Providers -> Email desactive 'Confirm email' para acceso instantáneo.";
        }
        return { success: false, error: msg };
      }
    } catch (e: any) {
      console.warn("Error en login remoto Supabase:", e);
    }
  }

  // Fallback a almacenamiento local de usuarios registrados
  const users = getStoredUsers();
  const found = users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (!found) {
    return {
      success: false,
      error: "Usuario no registrado en el sistema. Solicite al despacho crear su cuenta de cliente.",
    };
  }

  if (rawPassword && found.password && found.password !== rawPassword) {
    return {
      success: false,
      error: "Contraseña incorrecta. Por favor verifique e intente nuevamente.",
    };
  }

  const session = createUserSession(found);
  notifyAuthChange("SIGNED_IN", session);
  return { success: true, session };
}

// Cliente mock compatible con la API de Supabase para cuando aún no se conectan las credenciales
const mockSupabase = {
  auth: {
    async getSession() {
      return { data: { session: currentMockSession }, error: null };
    },
    async signInWithPassword({ email, password }: { email: string; password?: string }) {
      const res = await loginWithCredentials(email, password || "");
      if (res.success && res.session) {
        return { data: { session: res.session, user: res.session.user }, error: null };
      }
      return { data: { session: null, user: null }, error: { message: res.error || "Error de inicio de sesión" } };
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
  storage: {
    from(_bucket: string) {
      return {
        async upload(path: string, _file: any) {
          return { data: { path }, error: null };
        },
        getPublicUrl(path: string) {
          return { data: { publicUrl: `https://supabase.mock.storage/${path}` } };
        },
      };
    },
  },
};

// Singleton del cliente real de Supabase
let realSupabaseClientInstance: any = null;

export function resetRealClientInstance() {
  realSupabaseClientInstance = null;
}

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

// Exporta un cliente dinámico de Supabase que siempre delega a la conexión activa (real o mock)
export const supabase: any = new Proxy({} as any, {
  get(_target, prop) {
    const active = getSupabaseConfig().isConfigured ? getRealSupabaseClient() : (mockSupabase as any);
    const val = active[prop];
    if (typeof val === "function") {
      return val.bind(active);
    }
    return val;
  },
});

// Script SQL completo y a prueba de errores para configurar las tablas en Supabase con 1 clic
export const SUPABASE_SQL_SETUP_SCRIPT = `-- =========================================================================
-- ESQUEMA COMPLETO Y LISTO PARA EJECUTAR EN SUPABASE (J&A LEGAL)
-- Instrucciones:
-- 1. Ve a tu panel en https://supabase.com/dashboard
-- 2. Entra a tu proyecto -> SQL Editor -> New Query
-- 3. Pega todo este código y haz clic en "Run" (Ejecutar)
-- =========================================================================

-- Habilitar extensión pgcrypto para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA DE PERFILES DE USUARIO (Vinculada a auth.users o independiente)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Eliminar restricción foránea estricta si bloqueaba registros sin usuario previo en auth
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

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

-- 9. SINCRONIZAR USUARIOS YA REGISTRADOS EN AUTH.USERS DE FORMA DINÁMICA Y SEGURA
DO $$
BEGIN
  BEGIN
    EXECUTE '
      INSERT INTO public.profiles (id, email, full_name, initials, role, id_number, phone)
      SELECT 
        id,
        email,
        COALESCE(raw_user_meta_data->>''full_name'', SPLIT_PART(email, ''@'', 1), ''Usuario''),
        UPPER(SUBSTRING(COALESCE(raw_user_meta_data->>''full_name'', SPLIT_PART(email, ''@'', 1), ''US''), 1, 2)),
        CASE WHEN LOWER(email) = ''eldavidprz@gmail.com'' THEN ''firm'' ELSE COALESCE(raw_user_meta_data->>''role'', ''client'') END,
        COALESCE(raw_user_meta_data->>''id_number'', ''''),
        COALESCE(raw_user_meta_data->>''phone'', '''')
      FROM auth.users
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = CASE WHEN LOWER(EXCLUDED.email) = ''eldavidprz@gmail.com'' THEN ''firm'' ELSE public.profiles.role END
    ';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- 10. ASEGURAR PRIVILEGIOS DE SUPER ADMINISTRADOR PARA ELDAVIDPRZ@GMAIL.COM
DO $$
BEGIN
  BEGIN
    EXECUTE 'UPDATE public.profiles SET role = ''firm'' WHERE LOWER(email) = ''eldavidprz@gmail.com''';
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- 11. BUCKET DE SUPABASE STORAGE Y POLÍTICAS PÚBLICAS PARA DOCUMENTOS
DO $$
BEGIN
  -- Insertar bucket 'case-documents' si el esquema storage existe
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    BEGIN
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('case-documents', 'case-documents', true)
      ON CONFLICT (id) DO UPDATE SET public = true;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Políticas permisivas de lectura y subida para el bucket case-documents
    BEGIN
      DROP POLICY IF EXISTS "Lectura pública de case-documents" ON storage.objects;
      CREATE POLICY "Lectura pública de case-documents" ON storage.objects
        FOR SELECT USING (bucket_id = 'case-documents');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    BEGIN
      DROP POLICY IF EXISTS "Subida pública de case-documents" ON storage.objects;
      CREATE POLICY "Subida pública de case-documents" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'case-documents');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;
`;
