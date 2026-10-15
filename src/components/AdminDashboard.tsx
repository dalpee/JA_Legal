import { useState, useMemo, useEffect } from "react";
import { CaseRecord } from "../types/portal";
import {
  StoredUser,
  SUPER_ADMIN_EMAIL,
  ADMIN_1_EMAIL,
  ADMIN_2_EMAIL,
  canCreateAccounts,
  createUserAccount,
  deleteUserAccount,
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  syncAllLocalDataToSupabase,
  syncDocumentToDatabase,
  saveStoredCase,
  SUPABASE_SQL_SETUP_SCRIPT,
  updateUserPassword,
} from "../lib/supabaseClient";

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
  initialTab?: "casos" | "clientes" | "conexion_supabase";
  currentUser?: { email?: string | null; role?: string } | null;
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
}: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"all" | "client_name" | "client_id">("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"casos" | "clientes" | "conexion_supabase">(initialTab);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "client" | "firm">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [editingPasswordUserId, setEditingPasswordUserId] = useState<string | null>(null);
  const [editedPasswordValue, setEditedPasswordValue] = useState("");
  const [passwordChangeFeedback, setPasswordChangeFeedback] = useState<string | null>(null);

  // Validación estricta: solo Super Admin y los 2 Administradores de la firma pueden crear cuentas
  const userCanCreate = canCreateAccounts(currentUser);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Estados para crear un nuevo usuario desde el AdminDashboard
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Cliente2026*");
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
        text: `Acceso restringido: Solo el Super Admin (${SUPER_ADMIN_EMAIL}) y los 2 Socios Administradores (${ADMIN_1_EMAIL}, ${ADMIN_2_EMAIL}) pueden crear nuevas cuentas.`,
      });
      return;
    }

    if (!newEmail.trim() || !newFullName.trim()) {
      setUserCreationFeedback({ type: "error", text: "El correo y el nombre completo son obligatorios." });
      return;
    }

    setUserCreationLoading(true);
    try {
      const res = await createUserAccount(
        {
          email: newEmail.trim(),
          password: newPassword,
          full_name: newFullName.trim(),
          role: newRole,
          id_number: newIdNumber.trim(),
          phone: newPhone.trim(),
        },
        currentUser
      );

      if (res.success) {
        setUserCreationFeedback({
          type: "success",
          text: `Usuario ${newFullName} (${newEmail}) creado exitosamente con rol ${newRole === "firm" ? "Abogado" : "Cliente"}.`,
        });
        setNewEmail("");
        setNewFullName("");
        setNewIdNumber("");
        setNewPhone("");
        setNewPassword("Cliente2026*");
        if (onRefreshUsers) onRefreshUsers();
      } else {
        setUserCreationFeedback({ type: "error", text: res.message || "No se pudo crear el usuario." });
      }
    } catch (err: any) {
      setUserCreationFeedback({ type: "error", text: err.message || "Error al crear el usuario." });
    } finally {
      setUserCreationLoading(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      alert("No se puede eliminar la cuenta del Super Admin titular (eldavidprz@gmail.com).");
      return;
    }
    const confirmDelete = window.confirm(
      `¿Está seguro de eliminar al usuario ${userEmail}? Sus expedientes asignados permanecerán pero el usuario ya no podrá iniciar sesión.`
    );
    if (!confirmDelete) return;

    try {
      await deleteUserAccount(userId, userEmail);
      if (onRefreshUsers) onRefreshUsers();
    } catch (e: any) {
      alert(e.message || "Error eliminando usuario.");
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
      const email = (u.email || "").toLowerCase();
      const id = (u.id || "").toLowerCase();
      const doc = (u.id_number || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();

      const matchTerm =
        name.includes(term) ||
        email.includes(term) ||
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
      {/* Banner de Estado de Conexión a Supabase */}
      <div
        style={{
          background: isSupabaseLive ? "rgba(34, 197, 94, 0.08)" : "rgba(234, 179, 8, 0.08)",
          border: `1px solid ${isSupabaseLive ? "rgba(34, 197, 94, 0.35)" : "rgba(234, 179, 8, 0.35)"}`,
          borderRadius: "8px",
          padding: "12px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.2rem" }}>{isSupabaseLive ? "🟢" : "🟠"}</span>
          <div>
            <strong style={{ color: isSupabaseLive ? "#4ade80" : "#facc15", fontSize: "0.88rem", display: "block" }}>
              {isSupabaseLive
                ? `Conexión a Supabase Activa (${currentCfg.url})`
                : "Modo Local Activo — Conecte su Supabase para guardar en la nube"}
            </strong>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
              {isSupabaseLive
                ? "Los casos y usuarios se sincronizan con su base de datos PostgreSQL."
                : "Actualmente los datos se guardan en el navegador. Ingrese su URL y API Key en la pestaña '⚡ Conexión Supabase'."}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("conexion_supabase")}
          style={{
            background: "transparent",
            border: `1px solid ${isSupabaseLive ? "#4ade80" : "#facc15"}`,
            color: isSupabaseLive ? "#4ade80" : "#facc15",
            padding: "6px 14px",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isSupabaseLive ? "⚙️ Administrar Conexión Supabase" : "⚡ Conectar mi Supabase ahora"}
        </button>
      </div>

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
              👑 {SUPER_ADMIN_EMAIL}
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
          {/* 1. PANEL DE CLAVES Y CREDENCIALES DE LOS ADMINISTRADORES */}
          <div
            style={{
              background: "rgba(217, 181, 106, 0.08)",
              border: "1px solid var(--brass)",
              borderRadius: "8px",
              padding: "18px 22px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>🔑</span>
                <h4 style={{ margin: 0, fontSize: "1.05rem", color: "var(--brass-light)" }}>
                  Claves de Acceso de los 3 Administradores de J&amp;A Legal
                </h4>
              </div>
              <span style={{ fontSize: "0.72rem", background: "var(--brass)", color: "var(--ink)", padding: "2px 8px", borderRadius: "3px", fontWeight: 800 }}>
                Firma Autorizada
              </span>
            </div>

            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Tanto el Super Admin titular como los dos Socios Administradores tienen acceso total para gestionar expedientes y crear nuevas cuentas.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginTop: "4px" }}>
              {/* David Pérez */}
              <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--line)", padding: "12px 14px", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "var(--brass)", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  👑 Super Admin Titular
                </span>
                <strong style={{ display: "block", color: "var(--text-bright)", fontSize: "0.9rem" }}>David Pérez</strong>
                <p style={{ margin: "2px 0 6px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  <code>{SUPER_ADMIN_EMAIL}</code>
                </p>
                <div style={{ fontSize: "0.76rem", background: "var(--ink-soft)", padding: "6px 8px", borderRadius: "4px", border: "1px dashed var(--brass)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Contraseña: </span>
                  <code style={{ color: "var(--brass-light)", fontWeight: 700 }}>Admin2026*</code>
                </div>
              </div>

              {/* Dr. Marlon Jiménez */}
              <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--line)", padding: "12px 14px", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#38bdf8", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  ⚖️ Socio Administrador 1
                </span>
                <strong style={{ display: "block", color: "var(--text-bright)", fontSize: "0.9rem" }}>Dr. Marlon Jiménez</strong>
                <p style={{ margin: "2px 0 6px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  <code>{ADMIN_1_EMAIL}</code>
                </p>
                <div style={{ fontSize: "0.76rem", background: "var(--ink-soft)", padding: "6px 8px", borderRadius: "4px", border: "1px dashed #38bdf8" }}>
                  <span style={{ color: "var(--text-muted)" }}>Contraseña: </span>
                  <code style={{ color: "#38bdf8", fontWeight: 700 }}>Admin2026*</code>
                </div>
              </div>

              {/* Dr. Sebastián Ariza */}
              <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--line)", padding: "12px 14px", borderRadius: "6px" }}>
                <span style={{ fontSize: "0.68rem", textTransform: "uppercase", color: "#4ade80", fontWeight: 700, display: "block", marginBottom: "4px" }}>
                  ⚖️ Socio Administrador 2
                </span>
                <strong style={{ display: "block", color: "var(--text-bright)", fontSize: "0.9rem" }}>Dr. Felipe Sebastián Ariza</strong>
                <p style={{ margin: "2px 0 6px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  <code>{ADMIN_2_EMAIL}</code>
                </p>
                <div style={{ fontSize: "0.76rem", background: "var(--ink-soft)", padding: "6px 8px", borderRadius: "4px", border: "1px dashed #4ade80" }}>
                  <span style={{ color: "var(--text-muted)" }}>Contraseña: </span>
                  <code style={{ color: "#4ade80", fontWeight: 700 }}>Admin2026*</code>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid var(--line)", paddingTop: "8px" }}>
              💡 <em>Nota: Las cuentas de clientes creadas tienen por defecto la clave <code>Cliente2026*</code> (o la contraseña que tú le definas al crearlos abajo).</em>
            </div>
          </div>

          {/* 2. DÓNDE SE VEN REFLEJADAS LAS CUENTAS EN SUPABASE */}
          <div
            style={{
              background: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              padding: "16px 20px",
              borderRadius: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#38bdf8", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🌐 ¿Dónde veo reflejada la creación de cuentas de Supabase?</span>
            </h4>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text)", lineHeight: 1.5 }}>
              Las cuentas creadas se reflejan en <strong>dos lugares clave</strong>:
            </p>
            <ol style={{ margin: "4px 0 0", paddingLeft: "20px", fontSize: "0.8rem", color: "var(--text)", lineHeight: 1.6 }}>
              <li>
                <strong>En el Panel de Supabase en la Nube (https://supabase.com/dashboard):</strong>
                <ul style={{ marginTop: "3px" }}>
                  <li>
                    <strong>Authentication → Users:</strong> Aquí se reflejan las credenciales de inicio de sesión con su correo electrónico, fecha de creación y su <code>User UID</code>.
                  </li>
                  <li>
                    <strong>Table Editor → public.profiles:</strong> Aquí se refleja la tabla de perfiles con nombre completo, rol (<code>firm</code> para abogados y <code>client</code> para clientes), cédula y teléfono.
                  </li>
                  <li>
                    <strong>Table Editor → public.cases:</strong> Aquí se reflejan los procesos asignados a cada cliente mediante su <code>client_email</code> o <code>client_id</code>.
                  </li>
                </ul>
              </li>
              <li>
                <strong>En esta misma pantalla (Directorio abajo):</strong> Cada vez que creas un cliente aquí, se guarda tanto en Supabase como en la memoria del portal con su botón para vincularle un caso de inmediato.
              </li>
              <li>
                <strong>Sincronización en 1 Clic:</strong> Si creaste usuarios antes de conectar Supabase, ve a la pestaña <strong>"Conexión Supabase"</strong> y haz clic en <strong>"🚀 Sincronizar todos los datos a Supabase ahora"</strong> para que todas las cuentas se inserten en tus tablas de Supabase al instante.
              </li>
            </ol>
          </div>

          {/* Barra superior de gestión de usuarios */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.15rem", color: "var(--text-bright)" }}>
                Directorio de Usuarios & Cuentas Registradas ({registeredUsers.length})
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--brass)" }}>Acceso de Creación Restringido:</strong> Solo el Super Admin Titular (<strong>{SUPER_ADMIN_EMAIL}</strong>) y los 2 Administradores de la firma pueden crear cuentas en el sistema.
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
                <span>🔒 Creación restringida (Solo Super Admin {SUPER_ADMIN_EMAIL} y los 2 Admins de la firma)</span>
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
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="cliente@ejemplo.com"
                    style={{ width: "100%", padding: "8px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                    Contraseña Inicial *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{ width: "100%", padding: "8px 10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                  />
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
                placeholder="🔍 Buscar cliente por nombre, correo, cédula o ID de Supabase…"
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
              {passwordChangeFeedback && (
                <div
                  style={{
                    padding: "10px 16px",
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid #22c55e",
                    color: "#4ade80",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  }}
                >
                  ✓ {passwordChangeFeedback}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
              {filteredUsers.map((u) => {
              const isSuper = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
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
                    <p style={{ margin: "0 0 6px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {u.email}
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

                    {/* Bloque de Contraseña y Gestión de Clave */}
                    <div
                      style={{
                        background: "var(--ink-soft)",
                        border: "1px solid var(--line)",
                        padding: "8px 10px",
                        borderRadius: "4px",
                        marginTop: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                          Contraseña de Acceso:
                        </span>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedPasswords((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                            }
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--brass-light)",
                              fontSize: "0.7rem",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            {revealedPasswords[u.id] ? "🙈 Ocultar" : "👁️ Ver clave"}
                          </button>

                          {userCanCreate && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPasswordUserId(editingPasswordUserId === u.id ? null : u.id);
                                setEditedPasswordValue(u.password || (u.role === "firm" ? "Admin2026*" : "Cliente2026*"));
                                setPasswordChangeFeedback(null);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#38bdf8",
                                fontSize: "0.7rem",
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              ✏️ Cambiar
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: "3px" }}>
                        <code
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--brass-light)",
                            letterSpacing: revealedPasswords[u.id] ? "normal" : "2px",
                            fontWeight: 700,
                          }}
                        >
                          {revealedPasswords[u.id]
                            ? (u.password || (u.role === "firm" ? "Admin2026*" : "Cliente2026*"))
                            : "••••••••••••"}
                        </code>
                      </div>

                      {/* Editor en línea de contraseña */}
                      {editingPasswordUserId === u.id && (
                        <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--line)" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <input
                              type="text"
                              value={editedPasswordValue}
                              onChange={(e) => setEditedPasswordValue(e.target.value)}
                              placeholder="Nueva contraseña"
                              style={{
                                flex: 1,
                                padding: "4px 8px",
                                fontSize: "0.75rem",
                                background: "var(--parchment-deep)",
                                border: "1px solid var(--brass)",
                                borderRadius: "3px",
                                color: "var(--text-bright)",
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!editedPasswordValue.trim()) return;
                                const ok = updateUserPassword(u.id, editedPasswordValue.trim());
                                if (ok) {
                                  setPasswordChangeFeedback(`Clave actualizada para ${u.full_name}`);
                                  setEditingPasswordUserId(null);
                                  if (onRefreshUsers) onRefreshUsers();
                                  setTimeout(() => setPasswordChangeFeedback(null), 3000);
                                }
                              }}
                              style={{
                                background: "var(--brass)",
                                color: "var(--ink)",
                                border: "none",
                                borderRadius: "3px",
                                padding: "4px 10px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPasswordUserId(null)}
                              style={{
                                background: "transparent",
                                color: "var(--text-muted)",
                                border: "1px solid var(--line)",
                                borderRadius: "3px",
                                padding: "4px 8px",
                                fontSize: "0.72rem",
                                cursor: "pointer",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
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
                <li>Agrega dos variables:
                  <ul style={{ marginTop: "3px" }}>
                    <li><code>VITE_SUPABASE_URL</code> con el valor de tu Project URL.</li>
                    <li><code>VITE_SUPABASE_ANON_KEY</code> con el valor de tu Project API Key (anon/public).</li>
                  </ul>
                </li>
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
    </div>
  );
}
