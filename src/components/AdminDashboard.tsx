import { useState, useMemo, useEffect } from "react";
import type { AgendaItem, CaseRecord, DocumentItem, FinancialRecord, HistoryItem } from "../types/portal";
import type { AuditAction, AuditEntry } from "../lib/auditLog";
import {
  SUPER_ADMIN_EMAIL,
  LOGIN_EMAIL_DOMAIN,
  normalizeLoginUsername,
  canCreateAccounts,
  createUserAccount,
  updateUserProfile,
  resetManagedUserPassword,
  deleteUserAccount,
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  syncAllLocalDataToSupabase,
  syncDocumentToDatabase,
  saveStoredCase,
  SUPABASE_SQL_SETUP_SCRIPT,
} from "../lib/supabaseClient";
import type { StoredUser } from "../lib/supabaseClient";

interface AdminDashboardProps {
  allCases: CaseRecord[];
  onSelectCase: (caseRecord: CaseRecord) => void;
  onCreateNewCase: (prefilledClientId?: string, prefilledClientEmail?: string, prefilledClientName?: string) => void;
  onEditCase: (caseRecord: CaseRecord) => void;
  onDeleteCase: (caseId: string) => void;
  registeredUsers: StoredUser[];
  onNavigateToSection: (section: "resumen" | "proceso" | "agenda" | "documentos" | "historial" | "economia") => void;
  onRefreshUsers?: () => void;
  onRefreshCases?: () => void;
  initialTab?: "casos" | "clientes" | "conexion_supabase" | "auditoria";
  currentUser?: { email?: string | null; role?: string } | null;
  auditEvents?: AuditEntry[];
  auditCloudReady?: boolean;
  backupData?: { cases: CaseRecord[]; agenda: AgendaItem[]; history: HistoryItem[]; documents: DocumentItem[]; finances: FinancialRecord[] };
  onAudit?: (action: AuditAction, entity: string, entityId: string | undefined, summary: string) => void;
}

export function AdminDashboard({
  allCases,
  onSelectCase,
  onCreateNewCase,
  onEditCase,
  onDeleteCase,
  registeredUsers,
  onNavigateToSection,
  onRefreshUsers,
  onRefreshCases,
  initialTab = "casos",
  currentUser,
  auditEvents = [],
  auditCloudReady = false,
  backupData,
  onAudit,
}: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"all" | "client_name" | "client_id">("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"casos" | "clientes" | "conexion_supabase" | "auditoria">(initialTab);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "client" | "firm">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [editingUser, setEditingUser] = useState<StoredUser | null>(null);
  const [editProfile, setEditProfile] = useState({ username: "", full_name: "", role: "client" as "client" | "firm", id_number: "", phone: "" });
  const [editProfileError, setEditProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editPasswordUpdated, setEditPasswordUpdated] = useState(false);
  const [copiedNewCredentials, setCopiedNewCredentials] = useState(false);

  // Validación estricta: solo Super Admin y los 2 Administradores de la firma pueden crear cuentas
  const userCanCreate = canCreateAccounts(currentUser);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Estados para crear un nuevo usuario desde el AdminDashboard
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<"client" | "firm">("client");
  const [newIdNumber, setNewIdNumber] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [userCreationLoading, setUserCreationLoading] = useState(false);
  const [userCreationFeedback, setUserCreationFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Estados de configuración de Supabase
  const currentCfg = getSupabaseConfig();
  const [supabaseUrlInput, setSupabaseUrlInput] = useState(currentCfg.url);
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(currentCfg.anonKey);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ tested: boolean; success: boolean; message: string } | null>(null);

  // Estados para sincronización masiva de datos locales a Supabase
  const [isSyncingAllData, setIsSyncingAllData] = useState(false);
  const [syncAllFeedback, setSyncAllFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Estados para agregar documentos a los casos directamente desde el Dashboard
  const [activeCaseForDocModal, setActiveCaseForDocModal] = useState<CaseRecord | null>(null);
  const [docModalTitle, setDocModalTitle] = useState("");
  const [docModalCategory, setDocModalCategory] = useState("Auto / Providencia");
  const [docModalStatus, setDocModalStatus] = useState("Oficial");
  const [docModalFileName, setDocModalFileName] = useState("");
  const [docModalFileSize, setDocModalFileSize] = useState("");
  const [docModalDataUrl, setDocModalDataUrl] = useState<string | null>(null);
  const [docModalUploading, setDocModalUploading] = useState(false);
  const [docModalFeedback, setDocModalFeedback] = useState<string | null>(null);

  // Copiar ID de usuario al portapapeles
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copiar script SQL al portapapeles
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP_SCRIPT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDownloadBackup = () => {
    const payload = {
      product: "J&A Legal",
      exported_at: new Date().toISOString(),
      format_version: 1,
      data: {
        ...(backupData || { cases: allCases }),
        users: registeredUsers.map(({ password: _password, ...user }) => user),
      },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ja-legal-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Probar y guardar conexión a Supabase
  const handleSaveAndTestSupabase = async () => {
    setConnectionTesting(true);
    setConnectionStatus(null);
    try {
      saveSupabaseConfig(supabaseUrlInput, supabaseKeyInput);
      const testResult = await testSupabaseConnection(supabaseUrlInput, supabaseKeyInput);
      setConnectionStatus({
        tested: true,
        success: testResult.success,
        message: testResult.message,
      });
      if (testResult.success) {
        if (onRefreshUsers) onRefreshUsers();
        if (onRefreshCases) onRefreshCases();
      }
    } catch (e: any) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: e.message || "Error al verificar conexión",
      });
    } finally {
      setConnectionTesting(false);
    }
  };

  // Sincronizar todos los datos guardados en Vercel/Local directamente a Supabase
  const handleSyncAllData = async () => {
    setIsSyncingAllData(true);
    setSyncAllFeedback(null);
    try {
      const res = await syncAllLocalDataToSupabase();
      setSyncAllFeedback({ success: res.success, message: res.message });
      if (onRefreshCases) onRefreshCases();
      if (onRefreshUsers) onRefreshUsers();
    } catch (err: any) {
      setSyncAllFeedback({
        success: false,
        message: err.message || "Error al sincronizar datos a Supabase",
      });
    } finally {
      setIsSyncingAllData(false);
    }
  };

  // Manejar incorporación de documento a un caso
  const handleAdminAddDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCaseForDocModal || !docModalTitle.trim()) return;
    setDocModalUploading(true);
    setDocModalFeedback(null);
    try {
      const finalName = docModalFileName
        ? docModalTitle.trim()
        : docModalTitle.trim().endsWith(".pdf")
        ? docModalTitle.trim()
        : `${docModalTitle.trim()}.pdf`;

      const newDoc = {
        id: "doc_" + Date.now(),
        case_id: activeCaseForDocModal.id,
        name: finalName,
        category: docModalCategory,
        file_size: docModalFileSize || "1.2 MB",
        uploaded_at: new Date().toISOString().split("T")[0],
        status: docModalStatus || "Oficial",
        download_url: docModalDataUrl || undefined,
      };

      await syncDocumentToDatabase(newDoc);

      const updatedCase: CaseRecord = {
        ...activeCaseForDocModal,
        documents_count: (activeCaseForDocModal.documents_count || 0) + 1,
      };
      saveStoredCase(updatedCase);
      if (onRefreshCases) onRefreshCases();

      setDocModalFeedback("¡Documento incorporado exitosamente al expediente en Supabase!");
      setTimeout(() => {
        setActiveCaseForDocModal(null);
        setDocModalTitle("");
        setDocModalFileName("");
        setDocModalFileSize("");
        setDocModalDataUrl(null);
        setDocModalFeedback(null);
      }, 1200);
    } catch (err: any) {
      setDocModalFeedback("Error: " + (err.message || String(err)));
    } finally {
      setDocModalUploading(false);
    }
  };

  // Manejar creación de nuevo usuario
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreationFeedback(null);

    // Verificación estricta: solo Super Admin y los 2 Administradores autorizados
    if (!userCanCreate) {
      setUserCreationFeedback({
        type: "error",
        text: "Acceso restringido: solo los administradores autorizados pueden crear nuevas cuentas.",
      });
      return;
    }

    const username = normalizeLoginUsername(newUsername);
    if (!username || !newFullName.trim()) {
      setUserCreationFeedback({ type: "error", text: "El usuario y el nombre completo son obligatorios." });
      return;
    }
    if (newUsername.includes("@") || !/^[a-z0-9][a-z0-9._-]*$/.test(username)) {
      setUserCreationFeedback({ type: "error", text: "Use una abreviatura sencilla, por ejemplo marlon.jimenez, sin espacios." });
      return;
    }

    setUserCreationLoading(true);
    try {
      const res = await createUserAccount(
        {
          email: `${username}@${LOGIN_EMAIL_DOMAIN}`,
          username,
          password: newPassword,
          full_name: newFullName.trim(),
          role: newRole,
          id_number: newIdNumber.trim(),
          phone: newPhone.trim(),
        },
        currentUser
      );

      if (res.success) {
        onAudit?.("CREATE", "user", res.user?.id, `Creó la cuenta “${newFullName.trim()}” con usuario ${username} y rol ${newRole}.`);
        setUserCreationFeedback({
          type: "success",
          text: `Cuenta ${newFullName} creada. Usuario para iniciar sesión: ${username}.`,
        });
        setNewUsername("");
        setNewFullName("");
        setNewIdNumber("");
        setNewPhone("");
        setNewPassword("");
        if (onRefreshUsers) onRefreshUsers();
      } else {
        setUserCreationFeedback({ type: "error", text: res.message || "No se pudo crear el usuario." });
        if (res.user && onRefreshUsers) onRefreshUsers();
      }
    } catch (err: any) {
      setUserCreationFeedback({ type: "error", text: err.message || "Error al crear el usuario." });
    } finally {
      setUserCreationLoading(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    const userLabel = registeredUsers.find((user) => user.id === userId)?.username || registeredUsers.find((user) => user.id === userId)?.full_name || "este usuario";
    if (userEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert("No se puede eliminar la cuenta del Super Admin titular.");
      return;
    }
    const confirmDelete = window.confirm(
      `¿Está seguro de eliminar al usuario ${userLabel}? Sus expedientes asignados permanecerán, pero ya no podrá iniciar sesión.`
    );
    if (!confirmDelete) return;

    try {
      await deleteUserAccount(userId, userEmail);
      onAudit?.("DELETE", "user", userId, `Eliminó la cuenta ${userLabel} (${userEmail}).`);
      if (onRefreshUsers) onRefreshUsers();
    } catch (e: any) {
      alert(e.message || "Error eliminando usuario.");
    }
  };

  const openUserEditor = (user: StoredUser) => {
    setEditingUser(user);
    setEditProfile({
      username: user.username || user.email.split("@")[0],
      full_name: user.full_name || "",
      role: user.role,
      id_number: user.id_number || "",
      phone: user.phone || "",
    });
    setEditProfileError("");
    setEditNewPassword("");
    setShowEditPassword(false);
    setEditPasswordUpdated(false);
    setCopiedNewCredentials(false);
  };

  const handleSaveUserProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingUser) return;
    const username = normalizeLoginUsername(editProfile.username);
    if (!username || editProfile.username.includes("@") || !/^[a-z0-9][a-z0-9._-]*$/.test(username)) {
      setEditProfileError("Escribe una abreviatura válida, por ejemplo marlon.jimenez, sin espacios.");
      return;
    }
    if (!editProfile.full_name.trim()) {
      setEditProfileError("El nombre completo es obligatorio.");
      return;
    }
    if (editNewPassword && editNewPassword.length < 8) {
      setEditProfileError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    const duplicateUsername = registeredUsers.some((user) =>
      user.id !== editingUser.id && normalizeLoginUsername(user.username || user.email.split("@")[0]) === username
    );
    if (duplicateUsername) {
      setEditProfileError("Esa abreviatura ya está asignada a otra cuenta.");
      return;
    }

    setSavingProfile(true);
    setEditProfileError("");
    try {
      await updateUserProfile(editingUser, {
        username,
        full_name: editProfile.full_name.trim(),
        initials: editProfile.full_name.trim().split(/\s+/).map((part) => part[0]).join("").toUpperCase().slice(0, 2),
        role: canCreateAccounts({ email: editingUser.email }) ? "firm" : editProfile.role,
        id_number: editProfile.id_number.trim(),
        phone: editProfile.phone.trim(),
      });
      onAudit?.("UPDATE", "user", editingUser.id, `Actualizó el perfil de ${editProfile.full_name.trim()} (${username}).`);
      if (editNewPassword && !editPasswordUpdated) {
        await resetManagedUserPassword(editingUser.id, editingUser.email, editNewPassword);
        onAudit?.("PASSWORD_RESET", "user", editingUser.id, `Restableció la contraseña de ${editProfile.full_name.trim()}.`);
        setEditPasswordUpdated(true);
        setCopiedNewCredentials(false);
        if (onRefreshUsers) onRefreshUsers();
        return;
      }
      if (onRefreshUsers) onRefreshUsers();
      setEditingUser(null);
    } catch (error: any) {
      setEditProfileError(error?.message || "No se pudo guardar el perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Filtrado de casos por nombre o ID del cliente, radicado y título
  const filteredCases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allCases.filter((c) => {
      const assignedUser = registeredUsers.find(
        (u) => u.id === c.client_id || (c.client_email && u.email.toLowerCase() === c.client_email.toLowerCase())
      );

      const clientName = (c.client_name || assignedUser?.full_name || "").toLowerCase();
      const clientId = (c.client_id || "").toLowerCase();
      const clientEmail = (c.client_email || assignedUser?.email || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      const radicado = (c.radicado || "").toLowerCase();

      let matchSearch = true;
      if (term) {
        if (searchField === "client_name") {
          matchSearch = clientName.includes(term);
        } else if (searchField === "client_id") {
          matchSearch = clientId.includes(term);
        } else {
          matchSearch =
            clientName.includes(term) ||
            clientId.includes(term) ||
            clientEmail.includes(term) ||
            radicado.includes(term) ||
            title.includes(term);
        }
      }

      const matchBranch =
        selectedBranchFilter === "all" ||
        c.process_type.toLowerCase().includes(selectedBranchFilter.toLowerCase());

      return matchSearch && matchBranch;
    });
  }, [allCases, searchTerm, searchField, selectedBranchFilter, registeredUsers]);

  // Filtrado de usuarios y clientes
  const filteredUsers = useMemo(() => {
    return registeredUsers.filter((u) => {
      const term = userSearchTerm.trim().toLowerCase();
      const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
      if (!term) return matchRole;

      const name = (u.full_name || "").toLowerCase();
      const id = (u.id || "").toLowerCase();
      const doc = (u.id_number || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      const username = (u.username || "").toLowerCase();

      const matchTerm =
        name.includes(term) ||
        username.includes(term) ||
        id.includes(term) ||
        doc.includes(term) ||
        phone.includes(term);

      return matchRole && matchTerm;
    });
  }, [registeredUsers, userSearchTerm, userRoleFilter]);

  // Cálculos estadísticos
  const totalFees = allCases.reduce((acc, c) => acc + (Number(c.total_fees) || 0), 0);
  const totalBalance = allCases.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
  const totalClients = registeredUsers.filter((u) => u.role === "client").length;
  const isSupabaseLive = currentCfg.isConfigured;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>


      {/* Encabezado del Dashboard de Administración */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(217, 181, 106, 0.12) 0%, rgba(15, 39, 68, 0.6) 100%)",
          border: "1px solid var(--brass)",
          borderRadius: "8px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--brass-light)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Módulo del Super Admin Titular
            </span>
            <span style={{ background: "rgba(217, 181, 106, 0.2)", color: "var(--brass)", fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
              👑 Administrador autorizado
            </span>
          </div>
          <h2 style={{ margin: "4px 0 6px", fontSize: "1.5rem", color: "var(--text-bright)", fontFamily: "var(--font-heading)" }}>
            Panel de Control Procesal & Administración de Clientes
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)", maxWidth: "660px" }}>
            Cree nuevos procesos judiciales, asigne el <strong>ID de usuario cliente (UUID)</strong> para vincularlos en Supabase y actualice los adelantos que cada titular verá en su pantalla.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("clientes");
              setIsCreateUserModalOpen(true);
            }}
            style={{
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "10px 18px",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: "4px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>👤 + Crear Usuario</span>
          </button>

          <button
            type="button"
            onClick={() => onCreateNewCase()}
            style={{
              background: "var(--brass)",
              color: "var(--ink)",
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 14px rgba(217, 181, 106, 0.3)",
            }}
          >
            <span>+ Crear Nuevo Caso</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas del Despacho */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Expedientes Registrados</span>
          <strong style={{ fontSize: "1.6rem", display: "block", color: "var(--brass)", marginTop: "4px" }}>
            {allCases.length}
          </strong>
          <small style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Total en despacho</small>
        </div>

        <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Clientes en Base de Datos</span>
          <strong style={{ fontSize: "1.6rem", display: "block", color: "#38bdf8", marginTop: "4px" }}>
            {totalClients}
          </strong>
          <small style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Usuarios con cuenta</small>
        </div>

        <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Honorarios Globales Pactados</span>
          <strong style={{ fontSize: "1.4rem", display: "block", color: "#4ade80", marginTop: "4px" }}>
            ${totalFees.toLocaleString("es-CO")}
          </strong>
          <small style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Cuantía global de contratos</small>
        </div>

        <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Saldo por Recaudar</span>
          <strong style={{ fontSize: "1.4rem", display: "block", color: "#facc15", marginTop: "4px" }}>
            ${totalBalance.toLocaleString("es-CO")}
          </strong>
          <small style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Pendiente de abono</small>
        </div>
      </div>

      {/* Selector de Pestañas Principales */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--line)", paddingBottom: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setActiveTab("casos")}
          style={{
            background: activeTab === "casos" ? "var(--brass)" : "transparent",
            color: activeTab === "casos" ? "var(--ink)" : "var(--text)",
            border: activeTab === "casos" ? "none" : "1px solid var(--line)",
            fontWeight: 700,
            fontSize: "0.82rem",
            padding: "8px 18px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          📂 Gestión de Expedientes ({allCases.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("clientes")}
          style={{
            background: activeTab === "clientes" ? "var(--brass)" : "transparent",
            color: activeTab === "clientes" ? "var(--ink)" : "var(--text)",
            border: activeTab === "clientes" ? "none" : "1px solid var(--line)",
            fontWeight: 700,
            fontSize: "0.82rem",
            padding: "8px 18px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          👥 Usuarios & Cuentas ({registeredUsers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conexion_supabase")}
          style={{
            background: activeTab === "conexion_supabase" ? "var(--brass)" : "transparent",
            color: activeTab === "conexion_supabase" ? "var(--ink)" : "var(--text)",
            border: activeTab === "conexion_supabase" ? "none" : "1px solid var(--line)",
            fontWeight: 700,
            fontSize: "0.82rem",
            padding: "8px 18px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <span>⚡ Conexión Supabase & SQL</span>
          <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "8px", background: isSupabaseLive ? "#22c55e" : "#eab308", color: "#000", fontWeight: 800 }}>
            {isSupabaseLive ? "CONECTADO" : "LOCAL"}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("auditoria")}
          style={{
            background: activeTab === "auditoria" ? "var(--brass)" : "transparent",
            color: activeTab === "auditoria" ? "var(--ink)" : "var(--text)",
            border: activeTab === "auditoria" ? "none" : "1px solid var(--line)",
            fontWeight: 700,
            fontSize: "0.82rem",
            padding: "8px 18px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🛡️ Seguridad & Bitácora
        </button>
      </div>

      {/* ======================================================== */}
      {/* PESTAÑA 1: GESTIÓN DE EXPEDIENTES (TABLA Y TARJETAS)     */}
      {/* ======================================================== */}
      {activeTab === "casos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div
            style={{
              background: "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.12)",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px", position: "relative" }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    searchField === "client_name"
                      ? "Buscar por nombre del cliente (ej. Carlos, Roberto)..."
                      : searchField === "client_id"
                      ? "Buscar por ID / UUID del cliente (ej. usr_..., a1b2...)..."
                      : "Buscar por nombre de cliente, radicado, título o ID..."
                  }
                  style={{
                    width: "100%",
                    padding: "9px 36px 9px 12px",
                    background: "var(--parchment-deep)",
                    border: "1px solid var(--line)",
                    color: "var(--text-bright)",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtro por campo */}
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value as any)}
                style={{
                  padding: "9px 12px",
                  background: "var(--parchment-deep)",
                  border: "1px solid var(--line)",
                  color: "var(--text-bright)",
                  borderRadius: "4px",
                  fontSize: "0.82rem",
                }}
              >
                <option value="all">🔍 Todos los campos</option>
                <option value="client_name">👤 Solo Nombre del Cliente</option>
                <option value="client_id">🆔 Solo ID de Usuario (UUID)</option>
              </select>

              {/* Filtro por rama jurídica */}
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                style={{
                  padding: "9px 12px",
                  background: "var(--parchment-deep)",
                  border: "1px solid var(--line)",
                  color: "var(--text-bright)",
                  borderRadius: "4px",
                  fontSize: "0.82rem",
                }}
              >
                <option value="all">⚖️ Todas las áreas</option>
                <option value="civil">Civil</option>
                <option value="comercial">Comercial</option>
                <option value="laboral">Laboral</option>
                <option value="familia">Familia</option>
                <option value="inmobiliario">Inmobiliario</option>
              </select>

              {/* Selector de Vistas y Añadir Caso */}
              <div style={{ display: "flex", gap: "8px", marginLeft: "auto", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    background: "var(--parchment-deep)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    padding: "2px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    style={{
                      background: viewMode === "table" ? "var(--brass)" : "transparent",
                      color: viewMode === "table" ? "var(--ink)" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "3px",
                      padding: "6px 10px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title="Vista en tabla"
                  >
                    📋 Tabla
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    style={{
                      background: viewMode === "cards" ? "var(--brass)" : "transparent",
                      color: viewMode === "cards" ? "var(--ink)" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "3px",
                      padding: "6px 10px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title="Vista en tarjetas"
                  >
                    🗂️ Tarjetas
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onCreateNewCase()}
                  style={{
                    background: "var(--brass)",
                    color: "var(--ink)",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 8px rgba(217, 181, 106, 0.25)",
                  }}
                >
                  + Añadir Caso
                </button>
              </div>
            </div>

            {/* Chips de selección rápida de clientes */}
            {registeredUsers.filter((u) => u.role === "client").length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", paddingTop: "2px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  Filtrar rápido por cliente:
                </span>
                {registeredUsers
                  .filter((u) => u.role === "client")
                  .slice(0, 6)
                  .map((u) => {
                    const isSelected = searchTerm === u.full_name || searchTerm === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSearchTerm("");
                          } else {
                            setSearchTerm(u.full_name);
                            setSearchField("client_name");
                          }
                        }}
                        style={{
                          background: isSelected ? "var(--brass)" : "rgba(56, 189, 248, 0.08)",
                          color: isSelected ? "var(--ink)" : "#38bdf8",
                          border: `1px solid ${isSelected ? "var(--brass)" : "rgba(56, 189, 248, 0.25)"}`,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>👤 {u.full_name.split(" ")[0]}</span>
                        <code style={{ fontSize: "0.62rem", opacity: 0.85 }}>({u.id.slice(0, 8)}…)</code>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* LISTADO DE CASOS (TABLA O TARJETAS) */}
          {filteredCases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", background: "var(--ink-soft)", borderRadius: "6px", border: "1px dashed var(--line)" }}>
              <p style={{ margin: "0 0 12px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                {allCases.length === 0
                  ? "No hay casos registrados aún en el sistema."
                  : "No se encontraron casos que coincidan con la búsqueda."}
              </p>
              <button
                type="button"
                onClick={() => onCreateNewCase()}
                style={{
                  background: "var(--brass)",
                  color: "var(--ink)",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "4px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Crear el Primer Caso
              </button>
            </div>
          ) : viewMode === "table" ? (
            /* VISTA EN TABLA COMPLETA */
            <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--line)", borderRadius: "6px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--ink-soft)", borderBottom: "1px solid var(--line)", color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "12px 14px" }}>Radicado & Proceso</th>
                    <th style={{ padding: "12px 14px" }}>Cliente Titular</th>
                    <th style={{ padding: "12px 14px" }}>Rama / Despacho</th>
                    <th style={{ padding: "12px 14px" }}>Adelanto Procesal</th>
                    <th style={{ padding: "12px 14px" }}>Honorarios & Saldo</th>
                    <th style={{ padding: "12px 14px", textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c) => {
                    const assignedUser = registeredUsers.find(
                      (u) => u.id === c.client_id || (c.client_email && u.email.toLowerCase() === c.client_email.toLowerCase())
                    );
                    const clientName = c.client_name || assignedUser?.full_name || "Sin nombre";
                    const clientEmail = c.client_email || assignedUser?.email || "Sin correo";

                    return (
                      <tr key={c.id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <strong style={{ color: "var(--text-bright)", display: "block" }}>{c.title}</strong>
                          <span style={{ color: "var(--brass)", fontSize: "0.75rem", fontFamily: "monospace" }}>
                            {c.radicado || "Sin radicado asignado"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <strong style={{ display: "block", color: "var(--text-bright)" }}>{clientName}</strong>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>{clientEmail}</span>
                          {c.client_id && (
                            <code style={{ fontSize: "0.68rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "1px 5px", borderRadius: "3px" }}>
                              ID: {c.client_id.slice(0, 10)}…
                            </code>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ display: "inline-block", background: "rgba(217, 181, 106, 0.12)", color: "var(--brass)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, marginBottom: "4px" }}>
                            {c.process_type}
                          </span>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {c.authority || "Juzgado no asignado"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", minWidth: "140px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "3px" }}>
                            <span style={{ color: "var(--text-muted)" }}>{c.status}</span>
                            <strong style={{ color: c.progress >= 75 ? "#4ade80" : "var(--brass)" }}>{c.progress}%</strong>
                          </div>
                          <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${c.progress}%`, height: "100%", background: c.progress >= 75 ? "#4ade80" : "var(--brass)" }} />
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <strong style={{ color: "var(--text-bright)", display: "block" }}>
                            ${(Number(c.total_fees) || 0).toLocaleString("es-CO")}
                          </strong>
                          <span style={{ fontSize: "0.72rem", color: Number(c.balance) > 0 ? "#facc15" : "#4ade80" }}>
                            Saldo: ${(Number(c.balance) || 0).toLocaleString("es-CO")}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveCaseForDocModal(c);
                                setDocModalTitle("");
                                setDocModalFileName("");
                                setDocModalFileSize("");
                                setDocModalDataUrl(null);
                                setDocModalFeedback(null);
                              }}
                              style={{
                                background: "rgba(217, 181, 106, 0.15)",
                                border: "1px solid var(--brass)",
                                color: "var(--brass-light)",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              title="Subir / Agregar documento a este proceso"
                            >
                              📎 + Doc ({c.documents_count || 0})
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectCase(c)}
                              style={{
                                background: "rgba(56, 189, 248, 0.1)",
                                border: "1px solid rgba(56, 189, 248, 0.3)",
                                color: "#38bdf8",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                cursor: "pointer",
                              }}
                              title="Ver en portal"
                            >
                              👁️ Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditCase(c)}
                              style={{
                                background: "rgba(217, 181, 106, 0.15)",
                                border: "1px solid var(--brass)",
                                color: "var(--brass-light)",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                cursor: "pointer",
                              }}
                              title="Editar caso y adelantos"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Está seguro de eliminar el caso "${c.title}"?`)) {
                                  onDeleteCase(c.id);
                                }
                              }}
                              style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#ef4444",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                cursor: "pointer",
                              }}
                              title="Eliminar caso"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* VISTA EN TARJETAS */
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
              {filteredCases.map((c) => {
                const assignedUser = registeredUsers.find(
                  (u) => u.id === c.client_id || (c.client_email && u.email.toLowerCase() === c.client_email.toLowerCase())
                );
                return (
                  <div
                    key={c.id}
                    style={{
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "0.7rem", background: "rgba(217, 181, 106, 0.15)", color: "var(--brass)", padding: "2px 8px", borderRadius: "3px", fontWeight: 700 }}>
                          {c.process_type}
                        </span>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCaseForDocModal(c);
                              setDocModalTitle("");
                              setDocModalFileName("");
                              setDocModalFileSize("");
                              setDocModalDataUrl(null);
                              setDocModalFeedback(null);
                            }}
                            style={{ background: "rgba(217, 181, 106, 0.15)", border: "1px solid var(--brass)", color: "var(--brass-light)", padding: "3px 8px", borderRadius: "3px", fontSize: "0.7rem", cursor: "pointer", fontWeight: 600 }}
                            title="Agregar documento a este expediente"
                          >
                            📎 + Doc ({c.documents_count || 0})
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditCase(c)}
                            style={{ background: "transparent", border: "1px solid var(--brass)", color: "var(--brass)", padding: "3px 8px", borderRadius: "3px", fontSize: "0.7rem", cursor: "pointer" }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar caso "${c.title}"?`)) onDeleteCase(c.id);
                            }}
                            style={{ background: "transparent", border: "1px solid #ef4444", color: "#ef4444", padding: "3px 8px", borderRadius: "3px", fontSize: "0.7rem", cursor: "pointer" }}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                      <h4 style={{ margin: "0 0 4px", fontSize: "1rem", color: "var(--text-bright)" }}>{c.title}</h4>
                      <code style={{ fontSize: "0.72rem", color: "var(--brass)", display: "block", marginBottom: "8px" }}>
                        Radicado: {c.radicado || "N/A"}
                      </code>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Cliente: <strong>{c.client_name || assignedUser?.full_name || "No especificado"}</strong>
                      </p>
                    </div>

                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block" }}>Adelanto: {c.progress}%</span>
                        <div style={{ width: "80px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${c.progress}%`, height: "100%", background: "var(--brass)" }} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectCase(c)}
                        style={{
                          background: "var(--brass)",
                          color: "var(--ink)",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Ver en Portal →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* PESTAÑA 2: USUARIOS & CUENTAS (SUPER ADMIN)             */}
      {/* ======================================================== */}
      {activeTab === "clientes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Barra superior de gestión de usuarios */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.15rem", color: "var(--text-bright)" }}>
                Directorio de Usuarios & Cuentas Registradas ({registeredUsers.length})
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--brass)" }}>Acceso de creación restringido:</strong> solo los administradores autorizados pueden crear cuentas.
              </p>
            </div>

            {userCanCreate ? (
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(true)}
                style={{
                  background: "var(--brass)",
                  color: "var(--ink)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 2px 10px rgba(217, 181, 106, 0.25)",
                }}
              >
                <span>+ Crear Nueva Cuenta</span>
              </button>
            ) : (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#f87171",
                  padding: "8px 14px",
                  borderRadius: "4px",
                  fontSize: "0.78rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>🔒 Creación restringida a los administradores autorizados</span>
              </div>
            )}
          </div>

          {/* Formulario Modal / En línea para Crear Nuevo Usuario */}
          {isCreateUserModalOpen && (
            <div
              style={{
                background: "var(--ink-soft)",
                border: "1px solid var(--brass)",
                borderRadius: "8px",
                padding: "20px",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h4 style={{ margin: 0, fontSize: "1.05rem", color: "var(--brass-light)" }}>
                  + Crear Nueva Cuenta de Usuario en Supabase
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateUserModalOpen(false);
                    setUserCreationFeedback(null);
                  }}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1rem", cursor: "pointer" }}
                >
                  ✕ Cerrar
                </button>
              </div>

              {userCreationFeedback && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "4px",
                    marginBottom: "14px",
                    fontSize: "0.82rem",
                    background: userCreationFeedback.type === "success" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    border: `1px solid ${userCreationFeedback.type === "success" ? "#22c55e" : "#ef4444"}`,
                    color: userCreationFeedback.type === "success" ? "#4ade80" : "#ef4444",
                  }}
                >
                  {userCreationFeedback.text}
                </div>
              )}

              <form onSubmit={handleCreateUserSubmit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Ej. Roberto Gómez"
                    style={{ width: "100%", padding: "8px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Usuario de ingreso *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="marlon.jimenez"
                    autoComplete="off"
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]*"
                    style={{ width: "100%", padding: "8px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                  />
                  <small style={{ display: "block", marginTop: "4px", color: "var(--text-muted)", fontSize: "0.68rem" }}>
                    Para ingresar solo se necesita esta abreviatura y la contraseña.
                  </small>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Contraseña Inicial *
                  </label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Defina una contraseña de 6 caracteres o más"
                    style={{ width: "100%", padding: "8px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((visible) => !visible)}
                    aria-label={showNewPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    style={{ marginTop: "6px", padding: 0, background: "transparent", border: "none", color: "var(--brass-light)", fontSize: "0.74rem", cursor: "pointer" }}
                  >
                    {showNewPassword ? "🙈 Ocultar contraseña" : "👁️ Ver contraseña"}
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Rol en el Sistema
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    style={{ width: "100%", padding: "8px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                  >
                    <option value="client">👤 Cliente Titular (Solo ve su caso)</option>
                    <option value="firm">⚖️ Abogado / Firma (Acceso a todos los casos)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Cédula / Documento (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newIdNumber}
                    onChange={(e) => setNewIdNumber(e.target.value)}
                    placeholder="C.C. 1.020.304.050"
                    style={{ width: "100%", padding: "8px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Teléfono (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+57 300 123 4567"
                    style={{ width: "100%", padding: "8px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateUserModalOpen(false)}
                    style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text)", padding: "8px 16px", borderRadius: "4px", fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={userCreationLoading}
                    style={{ background: "var(--brass)", color: "var(--ink)", fontWeight: 700, padding: "8px 20px", border: "none", borderRadius: "4px", fontSize: "0.82rem", cursor: "pointer" }}
                  >
                    {userCreationLoading ? "Creando en Supabase…" : "Registrar y Crear Cuenta"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Barra de Búsqueda y Filtro de Usuarios */}
          <div
            style={{
              background: "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: "6px",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 300px" }}>
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="🔍 Buscar usuario por nombre, abreviatura, cédula o ID…"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--parchment-deep)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text-bright)",
                  fontSize: "0.85rem",
                }}
              />
              {userSearchTerm && (
                <button
                  type="button"
                  onClick={() => setUserSearchTerm("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  ✕ Limpiar
                </button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value as any)}
                style={{
                  padding: "8px 12px",
                  background: "var(--parchment-deep)",
                  border: "1px solid var(--line)",
                  borderRadius: "4px",
                  color: "var(--text-bright)",
                  fontSize: "0.82rem",
                }}
              >
                <option value="all">Todos los Roles ({registeredUsers.length})</option>
                <option value="client">👤 Clientes ({registeredUsers.filter((u) => u.role === "client").length})</option>
                <option value="firm">⚖️ Abogados ({registeredUsers.filter((u) => u.role === "firm").length})</option>
              </select>

              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                Mostrando {filteredUsers.length} de {registeredUsers.length}
              </span>
            </div>
          </div>

          {/* Directorio de Cuentas en Tarjetas */}
          {filteredUsers.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "36px 20px",
                background: "var(--parchment-deep)",
                border: "1px dashed var(--line)",
                borderRadius: "6px",
                color: "var(--text-muted)",
              }}
            >
              <p style={{ margin: "0 0 10px", fontSize: "0.95rem" }}>
                No se encontraron usuarios o clientes con el término <strong>"{userSearchTerm}"</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setUserSearchTerm("");
                  setUserRoleFilter("all");
                }}
                style={{
                  background: "var(--brass)",
                  color: "var(--ink)",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  padding: "6px 14px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
              {filteredUsers.map((u) => {
              const isSuper = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
              const isAccountAdmin = canCreateAccounts({ email: u.email });
              const clientCases = allCases.filter(
                (c) => c.client_id === u.id || (c.client_email && c.client_email.toLowerCase() === u.email.toLowerCase())
              );

              return (
                <div
                  key={u.id}
                  style={{
                    background: isSuper ? "rgba(217, 181, 106, 0.08)" : "var(--parchment-deep)",
                    border: `1px solid ${isSuper ? "var(--brass)" : "var(--line)"}`,
                    borderRadius: "6px",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      {isSuper ? (
                        <span style={{ fontSize: "0.72rem", background: "var(--brass)", color: "var(--ink)", padding: "2px 8px", borderRadius: "3px", fontWeight: 800 }}>
                          👑 Super Admin Titular
                        </span>
                      ) : isAccountAdmin ? (
                        <span style={{ fontSize: "0.72rem", background: "rgba(217, 181, 106, 0.15)", color: "var(--brass)", padding: "2px 8px", borderRadius: "3px", fontWeight: 700 }}>
                          🛡️ Administrador
                        </span>
                      ) : u.role === "firm" ? (
                        <span style={{ fontSize: "0.72rem", background: "rgba(217, 181, 106, 0.15)", color: "var(--brass)", padding: "2px 8px", borderRadius: "3px", fontWeight: 700 }}>
                          ⚖️ Abogado / Firma
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 8px", borderRadius: "3px", fontWeight: 700 }}>
                          👤 Cliente Titular
                        </span>
                      )}

                      <span style={{ fontSize: "0.72rem", color: clientCases.length > 0 ? "#4ade80" : "var(--text-muted)" }}>
                        {clientCases.length > 0 ? `📁 ${clientCases.length} caso(s)` : "Sin casos"}
                      </span>
                    </div>

                    <h4 style={{ margin: "0 0 4px", fontSize: "1.05rem", color: "var(--text-bright)" }}>
                      {u.full_name}
                    </h4>
                    <p style={{ margin: "0 0 8px", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      Usuario de ingreso: <strong style={{ color: "var(--text-bright)" }}>{u.username || u.email.split("@")[0]}</strong>
                    </p>

                    <p style={{ margin: "0 0 10px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Contraseña: no se puede consultar. Para asignar una nueva, usa <strong>Editar perfil</strong>.
                    </p>

                    {u.id_number && (
                      <p style={{ margin: "0 0 6px", fontSize: "0.74rem", color: "var(--text)" }}>
                        Documento: {u.id_number}
                      </p>
                    )}

                    {u.phone && (
                      <p style={{ margin: "0 0 10px", fontSize: "0.74rem", color: "var(--text)" }}>
                        Teléfono: {u.phone}
                      </p>
                    )}

                    {/* Bloque del ID de Usuario de Supabase */}
                    <div
                      style={{
                        background: "var(--ink-soft)",
                        border: "1px dashed var(--line)",
                        padding: "8px 10px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block" }}>
                          ID de Usuario en Supabase:
                        </span>
                        <code style={{ fontSize: "0.75rem", color: "var(--brass)", wordBreak: "break-all" }}>
                          {u.id}
                        </code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyId(u.id)}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--line)",
                          color: "var(--text-bright)",
                          fontSize: "0.7rem",
                          padding: "4px 8px",
                          borderRadius: "3px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {copiedId === u.id ? "¡Copiado!" : "Copiar"}
                      </button>
                    </div>

                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                    <button
                      type="button"
                      onClick={() => openUserEditor(u)}
                      style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text-bright)", fontWeight: 700, fontSize: "0.75rem", padding: "7px 12px", borderRadius: "4px", cursor: "pointer", flex: "1 1 120px" }}
                    >
                      ✏️ Editar perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateNewCase(u.id, u.email, u.full_name)}
                      style={{
                        background: "var(--brass)",
                        color: "var(--ink)",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        padding: "7px 12px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        flex: "1 1 140px",
                        textAlign: "center",
                      }}
                    >
                      + Vincular Nuevo Caso
                    </button>

                    {!isSuper && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          color: "#ef4444",
                          fontSize: "0.75rem",
                          padding: "7px 10px",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                        title="Eliminar usuario del sistema"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
        )}
      </div>
    )}

      {/* ======================================================== */}
      {/* PESTAÑA 3: CONEXIÓN SUPABASE & SQL (NUBE POSTGRESQL)      */}
      {/* ======================================================== */}
      {activeTab === "auditoria" && (
        <section style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(217,181,106,.14), rgba(15,39,68,.6))", border: "1px solid var(--brass)", borderRadius: "8px", padding: "22px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
            <div>
              <span style={{ color: "var(--brass-light)", fontSize: ".72rem", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Control y trazabilidad</span>
              <h3 style={{ margin: "6px 0", color: "var(--text-bright)", fontFamily: "var(--font-heading)" }}>Seguridad, actividad y copias</h3>
              <p style={{ margin: 0, color: "var(--text)", fontSize: ".86rem" }}>Consulta cambios recientes del despacho y descarga una copia de los datos operativos.</p>
            </div>
            <button type="button" onClick={handleDownloadBackup} style={{ background: "var(--brass)", color: "var(--ink)", border: 0, borderRadius: "5px", padding: "11px 16px", fontWeight: 800, cursor: "pointer" }}>⬇ Descargar respaldo</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: "12px" }}>
            <div style={{ background: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: "7px", padding: "15px" }}><small style={{ color: "var(--text-muted)" }}>Eventos recientes</small><strong style={{ display: "block", color: "var(--brass)", fontSize: "1.45rem", marginTop: "5px" }}>{auditEvents.length}</strong></div>
            <div style={{ background: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: "7px", padding: "15px" }}><small style={{ color: "var(--text-muted)" }}>Bitácora en Supabase</small><strong style={{ display: "block", color: auditCloudReady ? "#4ade80" : "#facc15", fontSize: "1rem", marginTop: "9px" }}>{auditCloudReady ? "Conectada" : "Requiere migración"}</strong></div>
            <div style={{ background: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: "7px", padding: "15px" }}><small style={{ color: "var(--text-muted)" }}>Datos incluidos en el respaldo</small><strong style={{ display: "block", color: "var(--text-bright)", fontSize: ".9rem", marginTop: "9px" }}>Casos, agenda, documentos, finanzas y perfiles</strong></div>
          </div>

          {!auditCloudReady && <div role="status" style={{ background: "rgba(250,204,21,.08)", border: "1px solid rgba(250,204,21,.35)", borderRadius: "6px", padding: "14px 16px", color: "var(--text)", lineHeight: 1.55 }}><strong style={{ color: "#facc15" }}>Activa el registro persistente:</strong> en Supabase abre <strong>SQL Editor</strong>, ejecuta el archivo <code>supabase/firm-accountability-security.sql</code> del proyecto y vuelve a cargar este panel. La bitácora local seguirá disponible mientras tanto.</div>}

          <div style={{ background: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ padding: "15px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}><strong style={{ color: "var(--text-bright)" }}>Actividad del despacho</strong><span style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>Cambios de casos, perfiles, documentos y movimientos</span></div>
            {auditEvents.length === 0 ? <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-muted)" }}>Todavía no hay acciones registradas. Los próximos cambios aparecerán aquí.</div> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}><thead><tr>{["Fecha", "Usuario", "Acción", "Elemento", "Detalle"].map((label) => <th key={label} style={{ padding: "11px 14px", textAlign: "left", color: "var(--text-muted)", fontSize: ".72rem", textTransform: "uppercase", borderBottom: "1px solid var(--line)" }}>{label}</th>)}</tr></thead><tbody>{auditEvents.map((entry) => <tr key={entry.id}><td style={{ padding: "12px 14px", color: "var(--text-muted)", whiteSpace: "nowrap", borderBottom: "1px solid var(--line)" }}>{new Date(entry.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}</td><td style={{ padding: "12px 14px", color: "var(--text-bright)", borderBottom: "1px solid var(--line)" }}>{entry.actor_name || entry.actor_email}</td><td style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)" }}><span style={{ color: entry.action === "DELETE" ? "#fb7185" : entry.action === "CREATE" ? "#4ade80" : "#38bdf8", fontWeight: 800, fontSize: ".74rem" }}>{entry.action}</span></td><td style={{ padding: "12px 14px", color: "var(--text)", borderBottom: "1px solid var(--line)" }}>{entry.entity}</td><td style={{ padding: "12px 14px", color: "var(--text)", borderBottom: "1px solid var(--line)" }}>{entry.summary}</td></tr>)}</tbody></table></div>}
          </div>
        </section>
      )}

      {activeTab === "conexion_supabase" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Tarjeta de Configuración de API Keys */}
          <div
            style={{
              background: "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--brass-light)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Integración de Base de Datos en Tiempo Real
              </span>
              <h3 style={{ margin: "4px 0 6px", fontSize: "1.3rem", color: "var(--text-bright)", fontFamily: "var(--font-heading)" }}>
                Conectar Credenciales de Supabase
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)", maxWidth: "700px" }}>
                Obtenga estos dos datos en su panel de Supabase: vaya a <strong>Project Settings → API</strong>.
                Al ingresarlos y guardar, los casos, documentos y cuentas se almacenarán permanentemente en su base de datos PostgreSQL de Supabase.
              </p>
            </div>

            {/* Aviso especial para despliegues en Vercel */}
            <div
              style={{
                background: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                padding: "14px 16px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                color: "var(--text)",
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: "#38bdf8", display: "block", marginBottom: "4px" }}>
                🚀 ¿Por qué no se guardaban los datos de Vercel en la base de datos?
              </strong>
              <span>
                Vercel compila tu proyecto en sus servidores. Para que Vercel se comunique con Supabase, <strong>debes configurar las variables en tu panel de Vercel</strong>:
              </span>
              <ol style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "0.78rem" }}>
                <li>Abre tu proyecto en <strong><a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>https://vercel.com/dashboard</a></strong>.</li>
                <li>Ve a <strong>Settings → Environment Variables</strong>.</li>
                <li>Agrega estas tres variables:
                  <ul style={{ marginTop: "3px" }}>
                    <li><code>VITE_SUPABASE_URL</code> con el valor de tu Project URL.</li>
                    <li><code>VITE_SUPABASE_ANON_KEY</code> con el valor de tu Project API Key (anon/public).</li>
                    <li><code>SUPABASE_SERVICE_ROLE_KEY</code> con la clave secreta de Supabase, solo para permitir que los administradores asignen nuevas contraseñas.</li>
                  </ul>
                </li>
                <li>La clave secreta no debe llevar el prefijo <code>VITE_</code>; Vercel la usa únicamente en su API privada y nunca se muestra al navegador.</li>
                <li>Ve a la pestaña <strong>Deployments</strong>, haz clic en los tres puntos (…) de tu último despliegue y selecciona <strong>Redeploy</strong>.</li>
              </ol>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-bright)", display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Project URL (VITE_SUPABASE_URL) *
                </label>
                <input
                  type="text"
                  value={supabaseUrlInput}
                  onChange={(e) => setSupabaseUrlInput(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--parchment-deep)",
                    border: "1px solid var(--line)",
                    color: "var(--text-bright)",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                  }}
                />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                  Encuéntrela en Supabase → Project Settings → API → Project URL
                </span>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", color: "var(--text-bright)", display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Project API Key anon / public (VITE_SUPABASE_ANON_KEY) *
                </label>
                <input
                  type="text"
                  value={supabaseKeyInput}
                  onChange={(e) => setSupabaseKeyInput(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--parchment-deep)",
                    border: "1px solid var(--line)",
                    color: "var(--text-bright)",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    fontFamily: "monospace",
                  }}
                />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                  Encuéntrela en Supabase → Project Settings → API → Project API Keys → anon public
                </span>
              </div>
            </div>

            {connectionStatus && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  background: connectionStatus.success ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  border: `1px solid ${connectionStatus.success ? "#22c55e" : "#ef4444"}`,
                  color: connectionStatus.success ? "#4ade80" : "#f87171",
                }}
              >
                {connectionStatus.success ? "✅ " : "❌ "}
                {connectionStatus.message}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                disabled={connectionTesting}
                onClick={handleSaveAndTestSupabase}
                style={{
                  background: "var(--brass)",
                  color: "var(--ink)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  padding: "10px 22px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {connectionTesting ? "Verificando con Supabase…" : "💾 Guardar Credenciales & Probar Conexión"}
              </button>

              <button
                type="button"
                disabled={isSyncingAllData}
                onClick={handleSyncAllData}
                style={{
                  background: "#0284c7",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  padding: "10px 22px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)",
                }}
                title="Pasa todos los procesos, documentos y usuarios que tengas al servidor Supabase"
              >
                <span>{isSyncingAllData ? "Sincronizando a Supabase…" : "🚀 Sincronizar Todos los Datos a Supabase"}</span>
              </button>

              {isSupabaseLive && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Desea desconectar Supabase y volver al modo local?")) {
                      clearSupabaseConfig();
                      setSupabaseUrlInput("");
                      setSupabaseKeyInput("");
                      setConnectionStatus(null);
                      window.location.reload();
                    }
                  }}
                  style={{
                    background: "transparent",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#ef4444",
                    fontSize: "0.8rem",
                    padding: "8px 14px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Desconectar Supabase
                </button>
              )}
            </div>

            {syncAllFeedback && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  background: syncAllFeedback.success ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.12)",
                  border: `1px solid ${syncAllFeedback.success ? "#22c55e" : "#ef4444"}`,
                  color: syncAllFeedback.success ? "#4ade80" : "#f87171",
                }}
              >
                {syncAllFeedback.success ? "✅ " : "❌ "}
                {syncAllFeedback.message}
              </div>
            )}
          </div>

          {/* Script SQL para Inicializar Tablas en Supabase */}
          <div
            style={{
              background: "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h4 style={{ margin: "0 0 6px", fontSize: "1.1rem", color: "var(--text-bright)" }}>
                  📋 Script SQL de Tablas para Supabase (1 Clic)
                </h4>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: "680px" }}>
                  Para que las tablas (<code>profiles</code>, <code>cases</code>, <code>agenda_items</code>, etc.) existan en su base de datos PostgreSQL de Supabase, copie este script, vaya a su panel de Supabase → <strong>SQL Editor</strong>, cree una nueva consulta (New Query), pegue el código y presione <strong>Run</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                style={{
                  background: copiedSql ? "#22c55e" : "var(--brass)",
                  color: "var(--ink)",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{copiedSql ? "✅ ¡Código SQL Copiado!" : "📋 Copiar Todo el Script SQL"}</span>
              </button>
            </div>

            <pre
              style={{
                background: "var(--ink-deep)",
                border: "1px solid var(--line)",
                borderRadius: "6px",
                padding: "14px",
                maxHeight: "340px",
                overflowY: "auto",
                fontSize: "0.75rem",
                color: "#e2e8f0",
                fontFamily: "monospace",
                lineHeight: 1.45,
              }}
            >
              {SUPABASE_SQL_SETUP_SCRIPT}
            </pre>
          </div>
        </div>
      )}

      {/* Modal para incorporar documentos a cualquier caso directamente desde el Admin Dashboard */}
      {activeCaseForDocModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backgroundColor: "rgba(10, 15, 29, 0.82)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "var(--ink-soft)",
              border: "1px solid var(--brass)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "520px",
              width: "100%",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--brass-light)", textTransform: "uppercase", fontWeight: 700 }}>
                  Expediente Judicial
                </span>
                <h3 style={{ margin: "2px 0 4px", fontSize: "1.15rem", color: "var(--text-bright)" }}>
                  Incorporar Documento
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Caso: <strong>{activeCaseForDocModal.title}</strong> · Radicado: {activeCaseForDocModal.radicado || "N/A"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveCaseForDocModal(null);
                  setDocModalFeedback(null);
                }}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.1rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {docModalFeedback && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "4px",
                  marginBottom: "14px",
                  fontSize: "0.82rem",
                  background: docModalFeedback.startsWith("Error") ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                  border: `1px solid ${docModalFeedback.startsWith("Error") ? "#ef4444" : "#22c55e"}`,
                  color: docModalFeedback.startsWith("Error") ? "#f87171" : "#4ade80",
                }}
              >
                {docModalFeedback}
              </div>
            )}

            <form onSubmit={handleAdminAddDocSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-bright)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                  Seleccionar Archivo (PDF, Word, Imagen)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setDocModalFileName(file.name);
                      const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
                      setDocModalFileSize(`${sizeInMb} MB`);
                      if (!docModalTitle.trim()) {
                        setDocModalTitle(file.name.replace(/\.[^/.]+$/, ""));
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        setDocModalDataUrl(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    padding: "8px",
                    background: "var(--parchment-deep)",
                    border: "1px dashed var(--line)",
                    borderRadius: "4px",
                    width: "100%",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-bright)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                  Nombre / Título del Documento *
                </label>
                <input
                  type="text"
                  required
                  value={docModalTitle}
                  onChange={(e) => setDocModalTitle(e.target.value)}
                  placeholder="Ej. Auto Admisorio de Demanda, Poder Judicial, Contestación..."
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    background: "var(--parchment-deep)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    color: "var(--text-bright)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-bright)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Categoría Procesal
                  </label>
                  <select
                    value={docModalCategory}
                    onChange={(e) => setDocModalCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "4px",
                      color: "var(--text-bright)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <option value="Auto / Providencia">Auto / Providencia</option>
                    <option value="Demanda / Poder">Demanda / Poder</option>
                    <option value="Memorial de Contestación">Memorial de Contestación</option>
                    <option value="Pruebas / Dictámenes">Pruebas / Dictámenes</option>
                    <option value="Sentencia / Fallo">Sentencia / Fallo</option>
                    <option value="Medidas Cautelares">Medidas Cautelares</option>
                    <option value="Contrato / Factura">Contrato / Factura</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-bright)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Estado
                  </label>
                  <select
                    value={docModalStatus}
                    onChange={(e) => setDocModalStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "4px",
                      color: "var(--text-bright)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <option value="Oficial">Oficial</option>
                    <option value="Cotejado y Verificado">Cotejado y Verificado</option>
                    <option value="En Revisión del Despacho">En Revisión del Despacho</option>
                    <option value="Borrador Preparatorio">Borrador Preparatorio</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setActiveCaseForDocModal(null)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--line)",
                    color: "var(--text-muted)",
                    padding: "8px 16px",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={docModalUploading}
                  style={{
                    background: "var(--brass)",
                    color: "var(--ink)",
                    border: "none",
                    padding: "8px 20px",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {docModalUploading ? "Guardando en Supabase…" : "Incorporar al Expediente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingUser(null); }}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(3, 8, 18, 0.78)", display: "grid", placeItems: "center", padding: "18px" }}
        >
          <form
            onSubmit={handleSaveUserProfile}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-profile-editor-title"
            style={{ width: "min(100%, 620px)", maxHeight: "90vh", overflowY: "auto", background: "var(--ink-soft)", border: "1px solid var(--brass)", borderRadius: "10px", padding: "22px", boxShadow: "0 18px 50px rgba(0,0,0,.45)", display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div>
                <h3 id="user-profile-editor-title" style={{ margin: 0, color: "var(--brass-light)" }}>Editar perfil de usuario</h3>
                <p style={{ margin: "5px 0 0", color: "var(--text-muted)", fontSize: "0.8rem" }}>{editingUser.full_name}</p>
              </div>
              <button type="button" onClick={() => setEditingUser(null)} aria-label="Cerrar editor" style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.1rem" }}>✕</button>
            </div>

            {editProfileError && <div role="alert" style={{ padding: "10px 12px", borderRadius: "5px", color: "#f87171", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.35)", fontSize: "0.82rem" }}>{editProfileError}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px", color: "var(--text-bright)", fontSize: "0.78rem" }}>
                Usuario o abreviatura de ingreso
                <input type="text" required value={editProfile.username} onChange={(event) => setEditProfile((current) => ({ ...current, username: event.target.value }))} placeholder="ej. marlon.jimenez" pattern="[A-Za-z0-9][A-Za-z0-9._-]*" style={{ width: "100%", padding: "9px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px" }} />
                <small style={{ color: "var(--text-muted)" }}>Se puede usar este nombre corto para iniciar sesión.</small>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px", color: "var(--text-bright)", fontSize: "0.78rem" }}>
                Nombre completo
                <input type="text" required value={editProfile.full_name} onChange={(event) => setEditProfile((current) => ({ ...current, full_name: event.target.value }))} style={{ width: "100%", padding: "9px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px", color: "var(--text-bright)", fontSize: "0.78rem" }}>
                Rol
                <select value={canCreateAccounts({ email: editingUser.email }) ? "firm" : editProfile.role} disabled={canCreateAccounts({ email: editingUser.email })} onChange={(event) => setEditProfile((current) => ({ ...current, role: event.target.value as "client" | "firm" }))} style={{ width: "100%", padding: "9px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px" }}>
                  <option value="client">Cliente</option>
                  <option value="firm">Abogado / Firma</option>
                </select>
                {canCreateAccounts({ email: editingUser.email }) && <small style={{ color: "var(--text-muted)" }}>Cuenta administradora protegida.</small>}
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px", color: "var(--text-bright)", fontSize: "0.78rem" }}>
                Documento o cédula
                <input type="text" value={editProfile.id_number} onChange={(event) => setEditProfile((current) => ({ ...current, id_number: event.target.value }))} style={{ width: "100%", padding: "9px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px" }} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "5px", color: "var(--text-bright)", fontSize: "0.78rem" }}>
                Teléfono
                <input type="tel" value={editProfile.phone} onChange={(event) => setEditProfile((current) => ({ ...current, phone: event.target.value }))} style={{ width: "100%", padding: "9px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px" }} />
              </label>
            </div>

            <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--line)", borderRadius: "5px", padding: "11px 12px" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "7px", color: "var(--text-bright)", fontSize: "0.78rem" }}>
                Asignar nueva contraseña (opcional)
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editNewPassword}
                    onChange={(event) => { setEditNewPassword(event.target.value); setEditPasswordUpdated(false); }}
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                    disabled={editPasswordUpdated}
                    style={{ flex: 1, minWidth: 0, padding: "9px 10px", background: "var(--ink-soft)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px" }}
                  />
                  <button type="button" onClick={() => setShowEditPassword((visible) => !visible)} aria-label={showEditPassword ? "Ocultar nueva contraseña" : "Mostrar nueva contraseña"} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", padding: "0 10px", cursor: "pointer" }}>{showEditPassword ? "Ocultar" : "Ver"}</button>
                </div>
                <small style={{ color: "var(--text-muted)" }}>La contraseña actual no se puede recuperar. Escribe una nueva solo si quieres reemplazarla.</small>
              </label>
              {editPasswordUpdated && (
                <div role="status" style={{ marginTop: "9px", color: "#4ade80", fontSize: "0.8rem" }}>
                  <p style={{ margin: "0 0 8px" }}>Nueva contraseña guardada. Compártela ahora con el usuario; solo se mostrará aquí hasta cerrar este editor.</p>
                  <button type="button" onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`Usuario: ${editProfile.username}\nContraseña: ${editNewPassword}`);
                      setCopiedNewCredentials(true);
                    } catch {
                      setEditProfileError("No se pudo copiar el acceso. Selecciona el usuario y la contraseña para copiarlos manualmente.");
                    }
                  }} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text-bright)", padding: "6px 10px", borderRadius: "4px", cursor: "pointer" }}>{copiedNewCredentials ? "Acceso copiado" : "Copiar usuario y contraseña"}</button>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "6px" }}>
              <button type="button" onClick={() => setEditingUser(null)} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text-bright)", padding: "9px 14px", borderRadius: "4px", cursor: "pointer" }}>{editPasswordUpdated ? "Cerrar" : "Cancelar"}</button>
              <button type="submit" disabled={savingProfile || editPasswordUpdated} style={{ background: "var(--brass)", border: "none", color: "var(--ink)", fontWeight: 700, padding: "9px 18px", borderRadius: "4px", cursor: "pointer" }}>{savingProfile ? "Guardando…" : editNewPassword && !editPasswordUpdated ? "Guardar perfil y contraseña" : "Guardar perfil"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

