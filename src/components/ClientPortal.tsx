import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import logo from "../assets/ja-legal-logo.svg";
import {
  supabase,
  getStoredCase,
  saveStoredCase,
  getStoredAgenda,
  saveStoredAgenda,
  getStoredHistory,
  saveStoredHistory,
  getStoredDocuments,
  saveStoredDocuments,
  syncDocumentToDatabase,
  deleteDocumentFromDatabase,
  fetchDocumentsForCaseFromDatabase,
  generateUuid,
  getStoredFinances,
  saveStoredFinances,
  resetAllToDefault,
  isConfiguredWithRealSupabase,
  getStoredCases,
  saveStoredCases,
  deleteStoredCase,
  getStoredUsers,
  syncCaseToDatabase,
  deleteCaseFromDatabase,
  fetchProfilesOrUsers,
  fetchAllCasesFromDatabase,
  SUPER_ADMIN_EMAIL,
  loginWithCredentials,
  type StoredUser,
} from "../lib/supabaseClient";
import { defaultProfile, firmProfile, caseTemplates } from "../data/initialData";
import { Profile, CaseRecord, AgendaItem, HistoryItem, DocumentItem, FinancialRecord } from "../types/portal";
import { CreateCaseModal } from "./CreateCaseModal";
import { AdminDashboard } from "./AdminDashboard";
import { CaseEditorDrawer } from "./CaseEditorDrawer";
import { PresentationBanner } from "./PresentationBanner";
import { DocumentModal } from "./DocumentModal";
import { FinanceSection } from "./FinanceSection";
import { LegalCalculator } from "./LegalCalculator";
import { SupabaseCasesTable } from "./SupabaseCasesTable";
import { SystemArchitectureModal } from "./SystemArchitectureModal";
import { ThemeToggle } from "./ThemeToggle";
import { Sliders, Sparkles, CheckCircle2, ArrowRight, Scale, FileText, Download } from "./icons";
import "./ClientPortal.css";

interface ClientPortalProps {
  onBackToSite?: () => void;
}

function formatDay(dateStr: string) {
  if (!dateStr) return { day: "--", month: "---" };
  const d = new Date(`${dateStr}T00:00:00`);
  return {
    day: d.getDate().toString().padStart(2, "0"),
    month: d.toLocaleDateString("es-CO", { month: "short" }).replace(".", "").toUpperCase(),
  };
}

function formatLong(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function ClientPortal({ onBackToSite }: ClientPortalProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [allCases, setAllCases] = useState<CaseRecord[]>([]);
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [finances, setFinances] = useState<FinancialRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Modal para crear y editar procesos
  const [isCreateCaseModalOpen, setIsCreateCaseModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseRecord | null>(null);

  // Estados para prellenar asignación de cliente y su ID
  const [prefillClientId, setPrefillClientId] = useState("");
  const [prefillClientEmail, setPrefillClientEmail] = useState("");
  const [prefillClientName, setPrefillClientName] = useState("");
  const [registeredUsersList, setRegisteredUsersList] = useState<StoredUser[]>([]);

  // Sección activa en el portal
  const [activeSection, setActiveSection] = useState<
    "resumen" | "proceso" | "agenda" | "documentos" | "historial" | "economia" | "calculadora" | "admin"
  >("resumen");
  const [adminSubTab, setAdminSubTab] = useState<"casos" | "clientes" | "conexion_supabase">("casos");

  // Estados de modales y herramientas
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentItem | null>(null);

  // Estados para subir y agregar documentos a los casos
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState<DocumentItem["category"]>("Auto / Providencia");
  const [docStatus, setDocStatus] = useState<string>("Oficial");
  const [docFileName, setDocFileName] = useState("");
  const [docFileSize, setDocFileSize] = useState("");
  const [docDataUrl, setDocDataUrl] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Estados de Autenticación Real (Solo Login, sin registro público ni recuperación en login)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sesión inicial + escucha de cambios
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } | any }) => {
      setSession(data?.session ?? null);
      setLoadingAuth(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, newSession: Session | null) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Carga de datos al autenticarse
  useEffect(() => {
    if (!session) {
      setProfile(null);
      setCaseRecord(null);
      setAgenda([]);
      setHistory([]);
      setDocuments([]);
      setFinances([]);
      return;
    }

    let cancelled = false;
    setLoadingData(true);

    (async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, initials, role")
        .eq("id", session.user.id)
        .single();

      if (cancelled) return;

      const isSuperAdmin = (session.user.email || "").toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
      const userRole = isSuperAdmin ? "firm" : (session.user.user_metadata?.role || profileData?.role || "client");
      const defaultName = isSuperAdmin ? "David Pérez" : (userRole === "firm" ? "David Pérez" : "Cliente Titular");
      const userName = session.user.user_metadata?.full_name || profileData?.full_name || defaultName;
      const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || (isSuperAdmin ? "DP" : "JA");

      const activeProfile: Profile = {
        id: session.user.id,
        full_name: userName,
        initials,
        role: userRole,
        email: session.user.email,
        id_number: session.user.user_metadata?.id_number || (isSuperAdmin ? "Super Admin Titular" : (userRole === "firm" ? "Abogado Titular" : "C.C. Registrada")),
        phone: session.user.user_metadata?.phone || "",
      };

      setProfile(activeProfile);

      // Cargar lista de casos guardados (desde Supabase si está conectado, o local)
      const storedCasesList = await fetchAllCasesFromDatabase();
      if (!cancelled) {
        setAllCases(storedCasesList);
      }

      // Cargar perfiles de usuarios registrados (para asignación rápida en AdminDashboard)
      const fetchedUsers = await fetchProfilesOrUsers();
      if (!cancelled) {
        setRegisteredUsersList(fetchedUsers);
      }

      let activeCase: CaseRecord | null = null;
      if (userRole === "firm") {
        // Los abogados ven todos los casos del despacho
        activeCase = storedCasesList.length > 0 ? storedCasesList[0] : null;
        if (!activeCase) {
          setActiveSection("admin");
        }
      } else {
        // El cliente SOLO ve el caso que le pertenece a él por correo o ID
        const clientEmailLower = (session.user.email || "").toLowerCase();
        activeCase = storedCasesList.find((c) =>
          (c.client_email && c.client_email.toLowerCase() === clientEmailLower) ||
          (c.client_id && c.client_id === session.user.id)
        ) || null;
      }

      if (cancelled) return;
      setCaseRecord(activeCase);

      const caseIdToUse = activeCase?.id || "no_case";

      const [agendaRes, historyRes, docsRes, finRes] = await Promise.all([
        supabase.from("agenda_items").select("*").eq("case_id", caseIdToUse).order("event_date", { ascending: true }),
        supabase.from("history_items").select("*").eq("case_id", caseIdToUse).order("event_date", { ascending: false }),
        supabase.from("documents").select("*").eq("case_id", caseIdToUse),
        supabase.from("financial_records").select("*"),
      ]);

      if (!cancelled) {
        setAgenda(agendaRes.data && agendaRes.data.length > 0 ? agendaRes.data : (activeCase ? getStoredAgenda() : []));
        setHistory(historyRes.data && historyRes.data.length > 0 ? historyRes.data : (activeCase ? getStoredHistory() : []));
        setDocuments(docsRes.data && docsRes.data.length > 0 ? docsRes.data : (activeCase ? getStoredDocuments() : []));
        setFinances(finRes.data && finRes.data.length > 0 ? finRes.data : getStoredFinances());
        setLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const refreshUsersList = async () => {
    const fetched = await fetchProfilesOrUsers();
    setRegisteredUsersList(fetched);
  };

  const refreshCasesList = async () => {
    const cases = await fetchAllCasesFromDatabase();
    setAllCases(cases);
  };

  const handleUpdateCase = async (updated: CaseRecord) => {
    saveStoredCase(updated);
    await syncCaseToDatabase(updated);
    const updatedList = await fetchAllCasesFromDatabase();
    setAllCases(updatedList);
    setCaseRecord(updated);
  };

  const handleSaveOrUpdateCase = async (savedCase: CaseRecord) => {
    saveStoredCase(savedCase);
    await syncCaseToDatabase(savedCase);
    const updatedList = await fetchAllCasesFromDatabase();
    setAllCases(updatedList);
    setCaseRecord(savedCase);
    setIsCreateCaseModalOpen(false);
    setEditingCase(null);
    setPrefillClientId("");
    setPrefillClientEmail("");
    setPrefillClientName("");
  };

  const handleDeleteCase = async (caseId: string) => {
    await deleteCaseFromDatabase(caseId);
    const updatedList = await fetchAllCasesFromDatabase();
    setAllCases(updatedList);
    setCaseRecord(updatedList.length > 0 ? updatedList[0] : null);
  };

  const handleUpdateAgenda = (updated: AgendaItem[]) => {
    setAgenda(updated);
    saveStoredAgenda(updated);
  };

  const handleUpdateHistory = (updated: HistoryItem[]) => {
    setHistory(updated);
    saveStoredHistory(updated);
  };

  // Selector de archivos del equipo del usuario
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocFileName(file.name);
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setDocFileSize(file.size > 1024 * 1024 ? `${sizeInMb} MB` : `${Math.max(1, Math.round(file.size / 1024))} KB`);
    if (!docTitle) {
      setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDocDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Agregar nuevo documento al caso activo
  const handleAddDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseRecord) {
      alert("Por favor seleccione un caso antes de agregar documentos.");
      return;
    }
    if (!docTitle.trim()) {
      alert("Ingrese el título o denominación del documento.");
      return;
    }

    setUploadingDoc(true);
    try {
      const finalName = docTitle.trim().endsWith(".pdf") || docTitle.trim().endsWith(".docx")
        ? docTitle.trim()
        : `${docTitle.trim()}.pdf`;

      const newDoc: DocumentItem = {
        id: generateUuid(),
        case_id: caseRecord.id,
        name: finalName,
        category: docCategory,
        file_size: docFileSize || "1.2 MB",
        uploaded_at: new Date().toISOString().split("T")[0],
        status: docStatus || "Oficial",
        download_url: docDataUrl || undefined,
      };

      await syncDocumentToDatabase(newDoc);
      const updatedDocs = [newDoc, ...documents];
      setDocuments(updatedDocs);

      handleUpdateCase({
        ...caseRecord,
        documents_count: updatedDocs.length,
      });

      setDocTitle("");
      setDocFileName("");
      setDocFileSize("");
      setDocDataUrl(null);
      setIsAddDocModalOpen(false);
    } catch (err: any) {
      alert("Error al agregar documento: " + (err.message || String(err)));
    } finally {
      setUploadingDoc(false);
    }
  };

  // Eliminar documento del expediente
  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el documento "${docName}" del expediente?`)) return;
    await deleteDocumentFromDatabase(docId);
    const updatedDocs = documents.filter((d) => d.id !== docId);
    setDocuments(updatedDocs);
    if (caseRecord) {
      handleUpdateCase({
        ...caseRecord,
        documents_count: updatedDocs.length,
      });
    }
  };

  const handleUpdateDocuments = (updated: DocumentItem[]) => {
    setDocuments(updated);
    saveStoredDocuments(updated);
    if (caseRecord) {
      handleUpdateCase({
        ...caseRecord,
        documents_count: updated.length,
      });
      // Sincronizar automáticamente cada documento con la base de datos de Supabase
      for (const doc of updated) {
        syncDocumentToDatabase(doc).catch((e) => console.warn("Error sync doc to Supabase:", e));
      }
    }
  };

  const handleUpdateProfile = (updated: Profile) => {
    setProfile(updated);
  };

  // Finanzas del despacho
  const handleAddTransaction = (newRecord: FinancialRecord) => {
    const updated = [newRecord, ...finances];
    setFinances(updated);
    saveStoredFinances(updated);
    if (newRecord.type === "ingreso" && caseRecord) {
      const newBal = Math.max(0, (caseRecord.balance || 0) - newRecord.amount);
      handleUpdateCase({
        ...caseRecord,
        balance: newBal,
      });
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = finances.filter((f) => f.id !== id);
    setFinances(updated);
    saveStoredFinances(updated);
  };

  const handleApplyLiquidationToCase = (summary: string, totalAmount: number) => {
    if (caseRecord) {
      handleUpdateCase({
        ...caseRecord,
        observations: `${caseRecord.observations ? caseRecord.observations + "\n\n" : ""}[Liquidación Judicial Activa]: ${summary}`,
      });
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const tpl = caseTemplates.find((t) => t.id === templateId);
    if (!tpl) return;

    const newCase: CaseRecord = {
      id: "case_" + tpl.id,
      client_id: profile?.id || "usr_demo_client_01",
      ...tpl.caseData,
    };

    const newAgenda: AgendaItem[] = tpl.agenda.map((ag, i) => ({
      id: `ag_tpl_${i}_` + Date.now(),
      case_id: newCase.id,
      ...ag,
    }));

    const newHistory: HistoryItem[] = tpl.history.map((h, i) => ({
      id: `hist_tpl_${i}_` + Date.now(),
      case_id: newCase.id,
      ...h,
    }));

    const newDocs: DocumentItem[] = tpl.documents.map((d, i) => ({
      id: `doc_tpl_${i}_` + Date.now(),
      case_id: newCase.id,
      ...d,
    }));

    handleUpdateCase(newCase);
    handleUpdateAgenda(newAgenda);
    handleUpdateHistory(newHistory);
    handleUpdateDocuments(newDocs);
  };

  const handleResetDefaults = () => {
    if (window.confirm("¿Desea restablecer todos los datos del caso a los valores predeterminados?")) {
      resetAllToDefault();
      setCaseRecord(getStoredCase());
      setAgenda(getStoredAgenda());
      setHistory(getStoredHistory());
      setDocuments(getStoredDocuments());
      setFinances(getStoredFinances());
      setProfile(defaultProfile);
    }
  };

  const handleToggleRole = () => {
    const nextRole = profile?.role === "client" ? "firm" : "client";
    const nextProfile: Profile = {
      ...(profile || defaultProfile),
      role: nextRole,
      full_name: nextRole === "firm" ? "Dra. Carolina Jiménez Ariza" : "Dr. Roberto Mendoza Vargas",
      initials: nextRole === "firm" ? "CJ" : "RM",
    };
    setProfile(nextProfile);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Login de Usuario Real con blindaje y auto-resolución para Super Admin
  async function handleLogin(event?: FormEvent) {
    if (event) event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setSubmitting(true);

    try {
      const res = await loginWithCredentials(email, password);
      if (res.success && res.session) {
        setSession(res.session);
      } else {
        setAuthError(res.error || "Error al intentar iniciar sesión. Verifique sus credenciales.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Error al intentar iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  // Acceso directo con 1 clic para el Super Admin Titular (David Pérez)
  async function handleQuickSuperAdminLogin() {
    setEmail(SUPER_ADMIN_EMAIL);
    setPassword("Admin2026*");
    setAuthError(null);
    setAuthSuccess("Accediendo como Super Administrador (David Pérez)…");
    setSubmitting(true);

    try {
      const res = await loginWithCredentials(SUPER_ADMIN_EMAIL, "Admin2026*");
      if (res.success && res.session) {
        setSession(res.session);
      } else {
        setAuthError(res.error || "No se pudo iniciar sesión.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Error al iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  const handleBack = () => {
    if (onBackToSite) {
      onBackToSite();
    } else {
      window.location.hash = "#inicio";
    }
  };

  if (loadingAuth) {
    return <div className="portal-loading">Verificando sesión segura…</div>;
  }

  // VISTA AUTENTICADA (DASHBOARD)
  if (session && profile) {
    const isFirm = profile.role === "firm";

    return (
      <main className="portal-dashboard">
        {/* Barra superior de herramientas y simulación */}
        <PresentationBanner
          onOpenEditor={() => setIsEditorOpen(true)}
          onLoadTemplate={handleLoadTemplate}
          onPrintReport={handlePrintReport}
          isPresentationMode={isPresentationMode}
          onTogglePresentationMode={() => setIsPresentationMode(!isPresentationMode)}
          userRole={profile.role}
          onToggleRole={handleToggleRole}
        />

        <header className="portal-topbar">
          <button type="button" onClick={handleBack} className="portal-back">
            ← Volver a la página
          </button>
          <div className="portal-brand">
            <img src={logo} alt="J&amp;A Legal" />
            <div>
              <strong>J&amp;A Legal</strong>
              <span>Sistema integral de gestión jurídica</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Rol Visible en Topbar */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-bright)", fontWeight: 500 }}>
                {profile.full_name}
              </span>
              <span className={isFirm ? "role-badge-firm" : "role-badge-client"}>
                {isFirm ? "⚖️ Abogado / Firma" : "👤 Cliente Titular"}
              </span>
            </div>

            <ThemeToggle />

            {isFirm && (
              <button
                type="button"
                onClick={() => setIsEditorOpen(true)}
                className="portal-logout"
                style={{
                  borderColor: "var(--brass)",
                  color: "var(--brass-light)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <Sliders size={14} />
                <span>Gestionar Proceso</span>
              </button>
            )}
            <button className="portal-logout" type="button" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </header>

        <div className="portal-shell">
          <aside className="portal-sidebar">
            <div className="portal-user">
              <span>{profile.initials}</span>
              <div>
                <strong>{profile.full_name}</strong>
                <span className={isFirm ? "role-badge-firm" : "role-badge-client"} style={{ marginTop: "4px" }}>
                  {isFirm ? "⚖️ Abogado / Firma" : "👤 Cliente Titular"}
                </span>
                {profile.id_number && (
                  <small style={{ display: "block", color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "2px" }}>
                    {profile.id_number}
                  </small>
                )}
              </div>
            </div>

            <nav className="portal-menu" aria-label="Portal de clientes">
              {/* Pestañas de Administración para Abogados */}
              {isFirm && (
                <>
                  <button
                    type="button"
                    className={activeSection === "admin" && adminSubTab === "casos" ? "active" : ""}
                    onClick={() => {
                      setActiveSection("admin");
                      setAdminSubTab("casos");
                    }}
                    style={{
                      borderLeft: activeSection === "admin" && adminSubTab === "casos" ? "3px solid var(--brass)" : "none",
                      background: activeSection === "admin" && adminSubTab === "casos" ? "rgba(217, 181, 106, 0.18)" : "rgba(217, 181, 106, 0.05)",
                      fontWeight: 700,
                    }}
                  >
                    <span>⚖️ Gestión de Casos</span>
                    <small style={{ color: "var(--brass-light)", fontWeight: 700 }}>{allCases.length} casos</small>
                  </button>

                  <button
                    type="button"
                    className={activeSection === "admin" && adminSubTab === "clientes" ? "active" : ""}
                    onClick={() => {
                      setActiveSection("admin");
                      setAdminSubTab("clientes");
                    }}
                    style={{
                      borderLeft: activeSection === "admin" && adminSubTab === "clientes" ? "3px solid #38bdf8" : "none",
                      background: activeSection === "admin" && adminSubTab === "clientes" ? "rgba(56, 189, 248, 0.18)" : "rgba(56, 189, 248, 0.05)",
                      fontWeight: 700,
                    }}
                  >
                    <span>👥 Directorio de Clientes</span>
                    <small style={{ color: "#38bdf8", fontWeight: 700 }}>
                      {registeredUsersList.length > 0 ? registeredUsersList.length : getStoredUsers().length} usuarios
                    </small>
                  </button>
                </>
              )}

              <button
                type="button"
                className={activeSection === "resumen" ? "active" : ""}
                onClick={() => setActiveSection("resumen")}
              >
                <span>Resumen</span>
              </button>
              <button
                type="button"
                className={activeSection === "proceso" ? "active" : ""}
                onClick={() => setActiveSection("proceso")}
                style={{
                  borderLeft: activeSection === "proceso" ? "3px solid var(--brass)" : "none",
                }}
              >
                <span>Procesos</span>
                <small style={{ color: "var(--brass-light)", fontWeight: 700 }}>
                  Supabase
                </small>
              </button>
              <button
                type="button"
                className={activeSection === "agenda" ? "active" : ""}
                onClick={() => setActiveSection("agenda")}
              >
                <span>Calendario</span>
                {agenda.length > 0 && <small style={{ color: "var(--brass)" }}>{agenda.length}</small>}
              </button>
              <button
                type="button"
                className={activeSection === "documentos" ? "active" : ""}
                onClick={() => setActiveSection("documentos")}
              >
                <span>Documentos</span>
                <small style={{ color: "var(--text-muted)" }}>{documents.length}</small>
              </button>
              <button
                type="button"
                className={activeSection === "historial" ? "active" : ""}
                onClick={() => setActiveSection("historial")}
              >
                <span>Historial</span>
              </button>

              {/* Pestaña: Economía & Honorarios */}
              <button
                type="button"
                className={activeSection === "economia" ? "active" : ""}
                onClick={() => setActiveSection("economia")}
                style={{
                  borderLeft: activeSection === "economia" ? "3px solid #4ade80" : "none",
                }}
              >
                <span>Economía & Honorarios</span>
                <small style={{ color: isFirm ? "#4ade80" : "var(--brass)", fontWeight: 700 }}>
                  $ COP
                </small>
              </button>

              {/* Pestaña: Liquidador Judicial (LegalTech) */}
              <button
                type="button"
                className={activeSection === "calculadora" ? "active" : ""}
                onClick={() => setActiveSection("calculadora")}
                style={{
                  borderLeft: activeSection === "calculadora" ? "3px solid var(--brass)" : "none",
                }}
              >
                <span>Liquidador Judicial</span>
                <small style={{ color: "var(--brass-light)" }}>LegalTech</small>
              </button>
            </nav>

            {/* Panel de control rápido para abogados */}
            {isFirm ? (
              <div
                style={{
                  padding: "16px",
                  background: "var(--ink-panel)",
                  border: "1px solid var(--brass)",
                  borderRadius: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--brass-light)", fontSize: "0.8rem", fontWeight: 600 }}>
                  <Scale size={14} />
                  <span>Panel del Abogado</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                  Actualice etapas, radicación de memoriales y registre pagos de honorarios para su cliente.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection("admin");
                      setAdminSubTab("casos");
                    }}
                    style={{
                      padding: "8px 12px",
                      background: activeSection === "admin" && adminSubTab === "casos" ? "rgba(217, 181, 106, 0.25)" : "transparent",
                      color: "var(--brass-light)",
                      border: "1px solid var(--brass)",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      borderRadius: "3px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <span>📊 Gestionar Casos ({allCases.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection("admin");
                      setAdminSubTab("clientes");
                    }}
                    style={{
                      padding: "8px 12px",
                      background: activeSection === "admin" && adminSubTab === "clientes" ? "rgba(56, 189, 248, 0.25)" : "transparent",
                      color: "#38bdf8",
                      border: "1px solid rgba(56, 189, 248, 0.45)",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      borderRadius: "3px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <span>👥 Directorio de Clientes & IDs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingCase(null);
                      setPrefillClientId("");
                      setPrefillClientEmail("");
                      setPrefillClientName("");
                      setIsCreateCaseModalOpen(true);
                    }}
                    style={{
                      padding: "8px 12px",
                      background: "var(--brass)",
                      color: "var(--ink)",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      border: "none",
                      borderRadius: "3px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <span>+ Crear Caso & Asignar Cliente</span>
                  </button>

                  {caseRecord && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCase(caseRecord);
                        setIsCreateCaseModalOpen(true);
                      }}
                      style={{
                        padding: "7px 12px",
                        background: "transparent",
                        border: "1px solid var(--brass)",
                        color: "var(--brass-light)",
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        borderRadius: "3px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <Sliders size={13} />
                      <span>Editar Caso & Adelantos</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "14px",
                  background: "rgba(56, 189, 248, 0.05)",
                  border: "1px solid rgba(56, 189, 248, 0.2)",
                  borderRadius: "4px",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: "#38bdf8", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  Atención Jurídica Directa
                </span>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Su apoderado legal es el Dr. Marlon Jiménez. Cualquier novedad es notificada en este portal.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsArchModalOpen(true)}
              style={{
                background: "transparent",
                border: "1px dashed var(--line)",
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                padding: "8px 10px",
                borderRadius: "4px",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                width: "100%",
                transition: "all 0.2s ease",
              }}
              title="Ficha técnica de ingeniería de sistemas"
            >
              <span>📐 Especificación & Auditoría</span>
            </button>

            <div
              style={{
                padding: "8px 10px",
                borderRadius: "4px",
                background: isConfiguredWithRealSupabase ? "rgba(34, 197, 94, 0.12)" : "rgba(234, 179, 8, 0.12)",
                border: `1px solid ${isConfiguredWithRealSupabase ? "rgba(34, 197, 94, 0.35)" : "rgba(234, 179, 8, 0.35)"}`,
                fontSize: "0.72rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "0.85rem" }}>{isConfiguredWithRealSupabase ? "🟢" : "🟠"}</span>
              <div>
                <strong style={{ color: isConfiguredWithRealSupabase ? "#4ade80" : "#facc15", display: "block" }}>
                  {isConfiguredWithRealSupabase ? "Supabase Cloud: Conectado" : "Supabase: Modo Local"}
                </strong>
                <span style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
                  {isConfiguredWithRealSupabase ? "PostgreSQL activo en la nube" : "Sin variables .env (Autónomo)"}
                </span>
              </div>
            </div>
          </aside>

          <section className="portal-content" id="resumen">
            {loadingData && <p className="portal-loading-inline">Cargando información procesal…</p>}

            {/* SECCIÓN ADMIN: PANEL DE ADMINISTRACIÓN Y ASIGNACIÓN DE CASOS */}
            {isFirm && activeSection === "admin" && (
              <AdminDashboard
                initialTab={adminSubTab}
                allCases={allCases}
                onSelectCase={(selected) => {
                  setCaseRecord(selected);
                  setActiveSection("resumen");
                }}
                onCreateNewCase={(prefillId, prefillEmail, prefillName) => {
                  setEditingCase(null);
                  setPrefillClientId(prefillId || "");
                  setPrefillClientEmail(prefillEmail || "");
                  setPrefillClientName(prefillName || "");
                  setIsCreateCaseModalOpen(true);
                }}
                onEditCase={(c) => {
                  setEditingCase(c);
                  setIsCreateCaseModalOpen(true);
                }}
                onDeleteCase={(id) => {
                  handleDeleteCase(id);
                }}
                registeredUsers={registeredUsersList.length > 0 ? registeredUsersList : getStoredUsers()}
                onNavigateToSection={(sec) => {
                  setActiveSection(sec);
                }}
                onRefreshUsers={refreshUsersList}
                onRefreshCases={refreshCasesList}
                currentUser={profile ? { email: profile.email, role: profile.role } : session?.user ? { email: session.user.email, role: isFirm ? "firm" : "client" } : { email, role: isFirm ? "firm" : "client" }}
              />
            )}

            {/* SECCIÓN NUEVA: ECONOMÍA & HONORARIOS */}
            {activeSection === "economia" && (
              <FinanceSection
                finances={finances}
                onAddTransaction={handleAddTransaction}
                onDeleteTransaction={handleDeleteTransaction}
                userProfile={profile}
                caseRecord={caseRecord}
              />
            )}

            {/* SECCIÓN NUEVA: LIQUIDADOR JUDICIAL */}
            {activeSection === "calculadora" && (
              <LegalCalculator onApplyToCase={handleApplyLiquidationToCase} />
            )}

            {/* SECCIÓN PROCESOS: TABLERO INTERACTIVO EN TIEMPO REAL CON SUPABASE & STORAGE */}
            {activeSection === "proceso" && (
              <SupabaseCasesTable
                onSelectCase={(selected) => {
                  setCaseRecord(selected);
                  setActiveSection("resumen");
                }}
                onNavigateToSection={(sec) => setActiveSection(sec)}
                currentProfile={profile}
                isFirmUser={isFirm}
              />
            )}

            {!loadingData && !caseRecord && activeSection !== "economia" && activeSection !== "calculadora" && activeSection !== "admin" && activeSection !== "proceso" && (
              <div className="portal-empty" style={{ textAlign: "center", padding: "48px 24px" }}>
                <span style={{ fontSize: "2.8rem", display: "block", marginBottom: "14px" }}>
                  {isFirm ? "⚖️" : "📂"}
                </span>
                <h2 style={{ fontSize: "1.35rem", color: "var(--text-bright)", marginBottom: "10px" }}>
                  {isFirm
                    ? "No hay procesos registrados en el despacho aún"
                    : "No tiene procesos judiciales asignados por el momento"}
                </h2>
                <p style={{ maxWidth: "560px", margin: "0 auto 24px", color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>
                  {isFirm
                    ? "Como abogado titular, puede ir agregando los expedientes poco a poco, asignándolos al correo del cliente correspondiente y actualizando sus adelantos para que solo él pueda verlos."
                    : `Bienvenido(a), ${profile?.full_name}. Actualmente no tiene procesos judiciales activos asignados a su cuenta (${session?.user?.email || profile?.email}). En cuanto su abogado titular registre su expediente, podrá consultar aquí los adelantos, las audiencias y los documentos oficiales.`}
                </p>
                {isFirm ? (
                  <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCase(null);
                        setPrefillClientId("");
                        setPrefillClientEmail("");
                        setPrefillClientName("");
                        setIsCreateCaseModalOpen(true);
                      }}
                      className="btn primary"
                      style={{ padding: "12px 24px", fontSize: "0.88rem", fontWeight: 700 }}
                    >
                      + Crear Primer Proceso / Caso
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection("admin")}
                      className="btn secondary"
                      style={{ padding: "12px 24px", fontSize: "0.88rem", fontWeight: 700, border: "1px solid var(--brass)", color: "var(--brass-light)" }}
                    >
                      Ver Panel de Clientes Registrados
                    </button>
                  </div>
                ) : (
                  <a
                    href="https://wa.me/573122149562?text=Hola%2C%20quisiera%20consultar%20el%20estado%20de%20mi%20caso"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn primary"
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", textDecoration: "none", padding: "10px 22px" }}
                  >
                    <span>💬 Contactar al Despacho (WhatsApp)</span>
                  </a>
                )}
              </div>
            )}

            {caseRecord && activeSection !== "economia" && activeSection !== "calculadora" && activeSection !== "admin" && activeSection !== "proceso" && (
              <>
                {/* BARRA DE GESTIÓN MULTI-CASO PARA ABOGADOS */}
                {isFirm && (
                  <div
                    style={{
                      background: "var(--ink-soft)",
                      border: "1px solid var(--brass)",
                      borderRadius: "6px",
                      padding: "12px 18px",
                      marginBottom: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.82rem", color: "var(--brass)", fontWeight: 700 }}>
                        📂 Expediente ({allCases.findIndex((c) => c.id === caseRecord.id) + 1} de {allCases.length}):
                      </span>
                      <select
                        value={caseRecord.id}
                        onChange={(e) => {
                          const selected = allCases.find((c) => c.id === e.target.value);
                          if (selected) setCaseRecord(selected);
                        }}
                        style={{
                          background: "var(--parchment-deep)",
                          color: "var(--text-bright)",
                          border: "1px solid var(--line)",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          maxWidth: "320px",
                        }}
                      >
                        {allCases.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} — {c.client_name || c.client_email}
                          </option>
                        ))}
                      </select>

                      {caseRecord.client_email && (
                        <span
                          style={{
                            fontSize: "0.72rem",
                            background: "rgba(56, 189, 248, 0.12)",
                            color: "#38bdf8",
                            padding: "4px 8px",
                            borderRadius: "3px",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                          }}
                          title="Solo este cliente puede ver este caso al iniciar sesión"
                        >
                          👤 Asignado a: <strong>{caseRecord.client_email}</strong>
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCase(caseRecord);
                          setIsCreateCaseModalOpen(true);
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "transparent",
                          border: "1px solid var(--brass)",
                          color: "var(--brass-light)",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Editar Caso & Adelantos
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingCase(null);
                          setIsCreateCaseModalOpen(true);
                        }}
                        style={{
                          padding: "6px 14px",
                          background: "var(--brass)",
                          color: "var(--ink)",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        + Nuevo Caso
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`¿Está seguro de eliminar el proceso "${caseRecord.title}"?`)) {
                            handleDeleteCase(caseRecord.id);
                          }
                        }}
                        style={{
                          padding: "6px 10px",
                          background: "transparent",
                          border: "1px solid #ef4444",
                          color: "#f87171",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                        title="Eliminar este proceso"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}

                <div className="content-header">
                  <div>
                    <p className="kicker">
                      {isFirm ? "Gestión Procesal del Despacho" : "Portal del Cliente Titular"}
                    </p>
                    <h1>
                      {activeSection === "resumen" && "Resumen General del Caso"}
                      {activeSection === "agenda" && "Calendario y Audiencias Judiciales"}
                      {activeSection === "documentos" && "Expediente Digital"}
                      {activeSection === "historial" && "Cuaderno de Actuaciones"}
                    </h1>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="status-pill">{caseRecord.status}</span>
                    {isFirm && (
                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(true)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          background: "rgba(217, 181, 106, 0.15)",
                          border: "1px solid var(--brass)",
                          color: "var(--brass-light)",
                          borderRadius: "3px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Sliders size={14} />
                        <span>Editar Caso</span>
                      </button>
                    )}
                  </div>
                </div>

                <article className="case-hero" id="proceso">
                  <div className="case-hero-main">
                    <span className="label">{caseRecord.process_type}</span>
                    <h2>{caseRecord.title}</h2>
                    <p className="case-authority">
                      <strong>Radicado:</strong> {caseRecord.id.toUpperCase()} ·{" "}
                      <strong>Despacho:</strong> {caseRecord.authority || "Juzgado Civil del Circuito"}
                    </p>
                    <p className="case-desc">
                      {caseRecord.observations ||
                        "Proceso en trámite preferencial con apoderamiento activo y cumplimiento estricto de términos legales."}
                    </p>

                    <div className="case-metadata-grid">
                      <div>
                        <span>Ciudad:</span>
                        <strong>{caseRecord.city}</strong>
                      </div>
                      <div>
                        <span>Fecha Radicación:</span>
                        <strong>{formatLong(caseRecord.filed_date)}</strong>
                      </div>
                      <div>
                        <span>Abogado Titular:</span>
                        <strong>{caseRecord.lawyer || "Dra. Carolina Jiménez Ariza"}</strong>
                      </div>
                      <div>
                        <span>Última Actualización:</span>
                        <strong>{formatLong(caseRecord.last_update)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="case-hero-progress">
                    <span className="progress-number">{caseRecord.progress}%</span>
                    <span className="progress-label">Avance Procesal</span>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${caseRecord.progress}%` }} />
                    </div>
                    <small>Fase actual: {caseRecord.current_phase || "Instrucción y Juzgamiento"}</small>
                  </div>
                </article>

                {/* TAB: RESUMEN */}
                {activeSection === "resumen" && (
                  <div className="portal-main-grid">
                    {/* Próximas Citas y Audiencias */}
                    <article className="portal-panel">
                      <div className="panel-title-row">
                        <div>
                          <p className="kicker">Diligencias Clave</p>
                          <h2>Próximas Audiencias</h2>
                        </div>
                        {isFirm && (
                          <button type="button" onClick={() => setIsEditorOpen(true)}>
                            + Agendar
                          </button>
                        )}
                      </div>

                      <div className="agenda-list">
                        {agenda.slice(0, 3).map((item) => {
                          const { day, month } = formatDay(item.event_date);
                          return (
                            <div className="agenda-item" key={item.id}>
                              <div className="agenda-date">
                                <strong>{day}</strong>
                                <span>{month}</span>
                              </div>
                              <div className="agenda-info">
                                <h3>{item.title}</h3>
                                <p>{item.detail}</p>
                                {item.location && <small>📍 {item.location}</small>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>

                    {/* Resumen Económico Rápido */}
                    <article className="portal-panel">
                      <div className="panel-title-row">
                        <div>
                          <p className="kicker">Estado Financiero</p>
                          <h2>Honorarios del Proceso</h2>
                        </div>
                        <button type="button" onClick={() => setActiveSection("economia")}>
                          Ver detalle
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "16px" }}>
                        <div style={{ background: "var(--parchment-deep)", padding: "14px", borderRadius: "4px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Pactado</span>
                          <p style={{ margin: "4px 0 0", fontSize: "1.2rem", fontWeight: 700, color: "var(--text-bright)" }}>
                            ${new Intl.NumberFormat("es-CO").format(caseRecord.total_fees || 18000000)}
                          </p>
                        </div>
                        <div style={{ background: "var(--parchment-deep)", padding: "14px", borderRadius: "4px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--brass)" }}>Saldo Pendiente</span>
                          <p style={{ margin: "4px 0 0", fontSize: "1.2rem", fontWeight: 700, color: "#f87171" }}>
                            ${new Intl.NumberFormat("es-CO").format(caseRecord.balance || 4500000)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveSection("economia")}
                        style={{
                          width: "100%",
                          marginTop: "16px",
                          padding: "10px",
                          background: "var(--parchment-deep)",
                          border: "1px solid var(--line)",
                          color: "var(--brass-light)",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                      >
                        Ir al Módulo Financiero Completo →
                      </button>
                    </article>
                  </div>
                )}

                {/* TAB: CALENDARIO */}
                {activeSection === "agenda" && (
                  <article className="portal-panel">
                    <div className="panel-title-row">
                      <div>
                        <p className="kicker">Calendario Judicial</p>
                        <h2>Audiencias y Términos</h2>
                      </div>
                      {isFirm && (
                        <button type="button" onClick={() => setIsEditorOpen(true)}>
                          + Programar Diligencia
                        </button>
                      )}
                    </div>

                    <div className="agenda-list" style={{ marginTop: "16px" }}>
                      {agenda.map((item) => {
                        const { day, month } = formatDay(item.event_date);
                        return (
                          <div className="agenda-item" key={item.id}>
                            <div className="agenda-date">
                              <strong>{day}</strong>
                              <span>{month}</span>
                            </div>
                            <div className="agenda-info">
                              <h3>{item.title}</h3>
                              <p>{item.detail}</p>
                              {item.location && <small>📍 {item.location}</small>}
                              {item.type && <span style={{ marginLeft: "10px", fontSize: "0.72rem", color: "var(--brass)" }}>[{item.type}]</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                )}

                {/* TAB: DOCUMENTOS */}
                {activeSection === "documentos" && (
                  <article className="portal-panel">
                    <div className="panel-title-row" style={{ flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <p className="kicker">Expediente Oficial</p>
                        <h2>Documentos del Caso ({documents.length})</h2>
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setIsAddDocModalOpen(true)}
                          style={{
                            background: "var(--brass)",
                            color: "var(--ink)",
                            border: "none",
                            borderRadius: "4px",
                            padding: "7px 14px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <FileText size={14} />
                          <span>+ Subir / Agregar Documento</span>
                        </button>
                        {isFirm && (
                          <button
                            type="button"
                            onClick={() => setIsEditorOpen(true)}
                            style={{
                              background: "transparent",
                              color: "var(--brass)",
                              border: "1px solid var(--brass)",
                              borderRadius: "4px",
                              padding: "7px 12px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            ⚙️ Gestionar Archivos
                          </button>
                        )}
                      </div>
                    </div>

                    {documents.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px 20px",
                          background: "var(--parchment-deep)",
                          border: "1px dashed var(--line)",
                          borderRadius: "6px",
                          marginTop: "16px",
                        }}
                      >
                        <span style={{ fontSize: "2.4rem", display: "block", marginBottom: "10px" }}>📄</span>
                        <h4 style={{ margin: "0 0 6px", color: "var(--text-bright)", fontSize: "1rem" }}>
                          No hay documentos incorporados a este expediente aún
                        </h4>
                        <p style={{ margin: "0 auto 16px", maxWidth: "440px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          Puede subir demandas, autos interlocutorios, pruebas periciales, poderes o memoriales en formato PDF, Word o imagen.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsAddDocModalOpen(true)}
                          style={{
                            background: "var(--brass)",
                            color: "var(--ink)",
                            border: "none",
                            borderRadius: "4px",
                            padding: "8px 16px",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          + Incorporar Primer Documento
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "14px", marginTop: "16px" }}>
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            style={{
                              padding: "16px",
                              background: "var(--parchment-deep)",
                              border: "1px solid var(--line)",
                              borderRadius: "6px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              gap: "12px",
                              transition: "transform 0.15s ease",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    color: "var(--brass)",
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    background: "rgba(217, 181, 106, 0.12)",
                                    padding: "2px 6px",
                                    borderRadius: "3px",
                                  }}
                                >
                                  {doc.category}
                                </span>
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                  {doc.uploaded_at ? String(doc.uploaded_at).slice(0, 10) : "Reciente"}
                                </span>
                              </div>
                              <h4 style={{ margin: "0 0 4px", fontSize: "0.92rem", color: "var(--text-bright)", lineHeight: 1.3 }}>
                                {doc.name}
                              </h4>
                              {doc.status && (
                                <span style={{ fontSize: "0.68rem", color: "#4ade80", background: "rgba(34, 197, 94, 0.1)", padding: "1px 6px", borderRadius: "3px" }}>
                                  ✓ {doc.status}
                                </span>
                              )}
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{doc.file_size || "1.2 MB"}</span>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDocForPreview(doc)}
                                  style={{
                                    background: "transparent",
                                    border: "1px solid var(--line)",
                                    color: "var(--text-bright)",
                                    padding: "4px 8px",
                                    borderRadius: "3px",
                                    cursor: "pointer",
                                    fontSize: "0.74rem",
                                  }}
                                  title="Visualizar documento"
                                >
                                  Ver
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (doc.download_url) {
                                      const a = document.createElement("a");
                                      a.href = doc.download_url;
                                      a.download = doc.name;
                                      window.document.body.appendChild(a);
                                      a.click();
                                      window.document.body.removeChild(a);
                                    } else {
                                      const content = `REPÚBLICA DE COLOMBIA · RAMA JUDICIAL
EXPEDIENTE: ${caseRecord?.title || "Proceso Judicial"}
RADICADO: ${caseRecord?.radicado || caseRecord?.id || "N/A"}
DOCUMENTO: ${doc.name}
CATEGORÍA: ${doc.category}
FECHA: ${doc.uploaded_at || new Date().toISOString()}

J&A LEGAL ASOCIADOS - COPIA DIGITAL OFICIAL AUTORIZADA`;
                                      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                                      const url = URL.createObjectURL(blob);
                                      const a = window.document.createElement("a");
                                      a.href = url;
                                      a.download = doc.name;
                                      window.document.body.appendChild(a);
                                      a.click();
                                      window.document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                    }
                                  }}
                                  style={{
                                    background: "var(--brass)",
                                    border: "none",
                                    color: "var(--ink)",
                                    fontWeight: 700,
                                    padding: "4px 9px",
                                    borderRadius: "3px",
                                    cursor: "pointer",
                                    fontSize: "0.74rem",
                                  }}
                                  title="Descargar copia del documento"
                                >
                                  Descargar
                                </button>
                                {isFirm && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc.id, doc.name)}
                                    style={{
                                      background: "transparent",
                                      border: "1px solid rgba(239, 68, 68, 0.4)",
                                      color: "#ef4444",
                                      padding: "4px 7px",
                                      borderRadius: "3px",
                                      cursor: "pointer",
                                      fontSize: "0.74rem",
                                    }}
                                    title="Eliminar documento del expediente"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                )}

                {/* TAB: HISTORIAL COMPLETO */}
                {activeSection === "historial" && (
                  <article className="portal-panel">
                    <div className="panel-title-row">
                      <div>
                        <p className="kicker">Línea de Tiempo</p>
                        <h2>Cuaderno de Actuaciones Procesales</h2>
                      </div>
                      {isFirm && (
                        <button type="button" onClick={() => setIsEditorOpen(true)}>
                          + Agregar actuación
                        </button>
                      )}
                    </div>

                    <div className="timeline" style={{ marginTop: "18px" }}>
                      {history.map((item) => (
                        <div className="timeline-item" key={item.id}>
                          <span className="timeline-dot" />
                          <div className="timeline-body">
                            <time>{formatLong(item.event_date)}</time>
                            <h3>{item.title}</h3>
                            <p>{item.detail}</p>
                            {item.note && <small>{item.note}</small>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                )}
              </>
            )}
          </section>
        </div>

        {/* Modal para Crear y Editar Proceso con asignación de cliente y adelantos */}
        <CreateCaseModal
          isOpen={isCreateCaseModalOpen}
          onClose={() => {
            setIsCreateCaseModalOpen(false);
            setEditingCase(null);
            setPrefillClientId("");
            setPrefillClientEmail("");
            setPrefillClientName("");
          }}
          onSaveCase={handleSaveOrUpdateCase}
          existingCase={editingCase}
          registeredUsers={registeredUsersList.length > 0 ? registeredUsersList : getStoredUsers()}
          prefilledClientId={prefillClientId}
          prefilledClientEmail={prefillClientEmail}
          prefilledClientName={prefillClientName}
        />

        {/* Drawer modificador de caso (solo firma) */}
        {caseRecord && (
          <CaseEditorDrawer
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            caseRecord={caseRecord}
            onUpdateCase={handleUpdateCase}
            agenda={agenda}
            onUpdateAgenda={handleUpdateAgenda}
            history={history}
            onUpdateHistory={handleUpdateHistory}
            documents={documents}
            onUpdateDocuments={handleUpdateDocuments}
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onResetDefaults={handleResetDefaults}
            onLoadTemplate={handleLoadTemplate}
            onEnterPresentationMode={() => {
              setIsEditorOpen(false);
              setIsPresentationMode(true);
            }}
          />
        )}

        {/* Modal de Documentos */}
        {caseRecord && (
          <DocumentModal
            document={selectedDocForPreview}
            caseRecord={caseRecord}
            onClose={() => setSelectedDocForPreview(null)}
          />
        )}

        {/* Modal para Subir / Agregar Documento al Proceso */}
        {isAddDocModalOpen && caseRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <div
              style={{
                background: "var(--ink-soft)",
                border: "1px solid var(--brass)",
                borderRadius: "8px",
                maxWidth: "520px",
                width: "100%",
                padding: "24px",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
                color: "var(--text)",
                position: "relative",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsAddDocModalOpen(false);
                  setDocTitle("");
                  setDocFileName("");
                  setDocFileSize("");
                  setDocDataUrl(null);
                }}
                style={{
                  position: "absolute",
                  top: "16px",
                  right: "16px",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
                <span style={{ fontSize: "1.5rem" }}>📄</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-bright)" }}>
                    Incorporar Documento al Expediente
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--brass)" }}>
                    {caseRecord.title} (Radicado: {caseRecord.radicado || caseRecord.id})
                  </p>
                </div>
              </div>

              <form onSubmit={handleAddDocumentSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Selector de Archivo Local */}
                <div
                  style={{
                    border: "2px dashed var(--line)",
                    borderRadius: "6px",
                    padding: "16px",
                    textAlign: "center",
                    background: "var(--parchment-deep)",
                  }}
                >
                  <label style={{ display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer", gap: "6px" }}>
                    <span style={{ fontSize: "1.6rem" }}>📁</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-bright)" }}>
                      {docFileName ? `Archivo seleccionado: ${docFileName}` : "Haga clic para seleccionar archivo (PDF, Word o Imagen)"}
                    </span>
                    {docFileSize && (
                      <span style={{ fontSize: "0.72rem", color: "var(--brass)" }}>
                        Tamaño detectado: {docFileSize}
                      </span>
                    )}
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  <span style={{ color: "var(--text-bright)", fontWeight: 600 }}>Título / Denominación del Documento *</span>
                  <input
                    type="text"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Ej. Auto Admisorio de la Demanda, Contestación, Poder..."
                    required
                    style={{
                      padding: "9px 12px",
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "4px",
                      color: "var(--text-bright)",
                      fontSize: "0.85rem",
                    }}
                  />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--text-bright)", fontWeight: 600 }}>Categoría Procesal</span>
                    <select
                      value={docCategory}
                      onChange={(e) => setDocCategory(e.target.value as any)}
                      style={{
                        padding: "9px 10px",
                        background: "var(--parchment-deep)",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        color: "var(--text-bright)",
                        fontSize: "0.82rem",
                      }}
                    >
                      <option value="Auto / Providencia">Auto / Providencia</option>
                      <option value="Demanda / Poder">Demanda / Poder</option>
                      <option value="Memorial de Contestación">Memorial de Contestación</option>
                      <option value="Pruebas / Dictámenes">Pruebas / Dictámenes</option>
                      <option value="Medidas Cautelares">Medidas Cautelares</option>
                      <option value="Sentencia / Fallo">Sentencia / Fallo</option>
                      <option value="Contrato / Factura">Contrato / Factura</option>
                      <option value="Liquidación de Costas">Liquidación de Costas</option>
                    </select>
                  </label>

                  <label style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <span style={{ color: "var(--text-bright)", fontWeight: 600 }}>Estado de Cotejo</span>
                    <select
                      value={docStatus}
                      onChange={(e) => setDocStatus(e.target.value)}
                      style={{
                        padding: "9px 10px",
                        background: "var(--parchment-deep)",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        color: "var(--text-bright)",
                        fontSize: "0.82rem",
                      }}
                    >
                      <option value="Oficial">Oficial</option>
                      <option value="Cotejado y Verificado">Cotejado y Verificado</option>
                      <option value="En Revisión del Despacho">En Revisión del Despacho</option>
                      <option value="Borrador Preparatorio">Borrador Preparatorio</option>
                    </select>
                  </label>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddDocModalOpen(false);
                      setDocTitle("");
                      setDocFileName("");
                      setDocFileSize("");
                      setDocDataUrl(null);
                    }}
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
                    disabled={uploadingDoc}
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
                    {uploadingDoc ? "Guardando en Supabase…" : "Incorporar al Expediente"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Arquitectura del Software (Ingeniería de Sistemas) */}
        <SystemArchitectureModal
          isOpen={isArchModalOpen}
          onClose={() => setIsArchModalOpen(false)}
        />
      </main>
    );
  }

  // =========================================================================
  // VISTA DE LOGIN EXCLUSIVA (Solo Login, sin registro público ni cuentas demo)
  // =========================================================================
  return (
    <main className="client-portal login-view">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: "420px", marginBottom: "16px" }}>
        <button type="button" onClick={handleBack} className="portal-back login-back" style={{ margin: 0 }}>
          ← Volver al sitio web principal
        </button>
        <ThemeToggle />
      </div>

      <section className="portal-card login-card" style={{ maxWidth: "420px", padding: "32px 28px" }}>
        <img src={logo} alt="Jiménez &amp; Ariza Asociados" className="portal-logo" style={{ maxWidth: "180px", margin: "0 auto 16px" }} />

        <p className="kicker" style={{ textAlign: "center" }}>Acceso Corporativo Seguro</p>
        <h1 style={{ fontSize: "1.35rem", marginBottom: "6px", textAlign: "center" }}>
          Portal de Clientes &amp; Despacho
        </h1>
        <p className="portal-text" style={{ fontSize: "0.82rem", marginBottom: "22px", textAlign: "center", color: "var(--text-muted)" }}>
          Ingrese sus credenciales autorizadas para consultar y gestionar sus expedientes judiciales.
        </p>

        {authSuccess && <p className="auth-success-msg">{authSuccess}</p>}
        {authError && (
          <div style={{ marginBottom: "16px" }}>
            <p className="portal-form-error" style={{ marginBottom: "8px" }}>{authError}</p>
            {email.toLowerCase().includes("eldavidprz") && (
              <button
                type="button"
                onClick={handleQuickSuperAdminLogin}
                style={{
                  background: "rgba(217, 181, 106, 0.2)",
                  border: "1px solid var(--brass)",
                  color: "var(--brass-light)",
                  borderRadius: "4px",
                  padding: "6px 12px",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                🔑 Ingresar automáticamente como Super Admin (Admin2026*)
              </button>
            )}
          </div>
        )}

        {/* TARJETA DE ACCESO RÁPIDO PARA SUPER ADMINISTRADOR */}
        <div
          style={{
            background: "rgba(217, 181, 106, 0.08)",
            border: "1px solid rgba(217, 181, 106, 0.35)",
            borderRadius: "6px",
            padding: "14px 16px",
            marginBottom: "20px",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--brass)", fontWeight: 700 }}>
              Acceso Titular Autorizado
            </span>
            <span style={{ fontSize: "0.68rem", background: "var(--brass)", color: "var(--ink)", padding: "2px 7px", borderRadius: "3px", fontWeight: 700 }}>
              Super Admin
            </span>
          </div>

          <div style={{ fontSize: "0.78rem", color: "var(--text-bright)", lineHeight: 1.5, marginBottom: "10px" }}>
            <p style={{ margin: 0 }}>
              <strong>Usuario:</strong> <code style={{ color: "var(--brass-light)" }}>eldavidprz@gmail.com</code>
            </p>
            <p style={{ margin: "2px 0 0" }}>
              <strong>Contraseña:</strong> <code style={{ color: "var(--brass-light)" }}>Admin2026*</code>{" "}
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>(A mayúscula y asterisco *)</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleQuickSuperAdminLogin}
            disabled={submitting}
            style={{
              width: "100%",
              background: "var(--brass)",
              color: "var(--ink)",
              border: "none",
              borderRadius: "4px",
              padding: "9px 12px",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              transition: "all 0.15s ease",
            }}
          >
            <span>⚡ Iniciar Sesión con 1 Clic (David Pérez)</span>
          </button>
        </div>

        {/* FORMULARIO MANUAL DE INICIO DE SESIÓN */}
        <form className="portal-form" onSubmit={handleLogin}>
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="eldavidprz@gmail.com"
              required
              autoFocus
            />
          </label>

          <label>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Contraseña</span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--brass-light)",
                  fontSize: "0.74rem",
                  cursor: "pointer",
                  padding: "0 4px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {showPassword ? "🙈 Ocultar" : "👁️ Ver contraseña"}
              </button>
            </div>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin2026*"
                required
                style={{ paddingRight: "40px", width: "100%" }}
              />
            </div>
          </label>

          <button className="btn primary" type="submit" disabled={submitting} style={{ marginTop: "12px", width: "100%", padding: "12px", fontWeight: 700 }}>
            {submitting ? "Verificando credenciales…" : "Iniciar Sesión"}
          </button>
        </form>

        <div style={{ marginTop: "24px", paddingTop: "14px", borderTop: "1px solid var(--line)", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--text-muted)" }}>
            J&amp;A Legal · Jiménez &amp; Ariza Asociados © {new Date().getFullYear()}
          </p>
        </div>
      </section>
    </main>
  );
}
