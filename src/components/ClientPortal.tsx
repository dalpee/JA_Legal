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
  getStoredFinances,
  saveStoredFinances,
  resetAllToDefault,
} from "../lib/supabaseClient";
import { defaultProfile, firmProfile, caseTemplates } from "../data/initialData";
import { Profile, CaseRecord, AgendaItem, HistoryItem, DocumentItem, FinancialRecord } from "../types/portal";
import { CaseEditorDrawer } from "./CaseEditorDrawer";
import { PresentationBanner } from "./PresentationBanner";
import { DocumentModal } from "./DocumentModal";
import { FinanceSection } from "./FinanceSection";
import { LegalCalculator } from "./LegalCalculator";
import { SystemArchitectureModal } from "./SystemArchitectureModal";
import { Sliders, Sparkles, CheckCircle2, ArrowRight, Scale, FileText } from "./icons";
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
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [finances, setFinances] = useState<FinancialRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Sección activa en el portal
  const [activeSection, setActiveSection] = useState<
    "resumen" | "proceso" | "agenda" | "documentos" | "historial" | "economia" | "calculadora"
  >("resumen");

  // Estados de modales y herramientas
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentItem | null>(null);

  // Estados de Autenticación Real
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regRole, setRegRole] = useState<"client" | "firm">("client");
  const [regIdNumber, setRegIdNumber] = useState("");
  const [regPhone, setRegPhone] = useState("");
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

      const userRole = session.user.user_metadata?.role || profileData?.role || "client";
      const userName = session.user.user_metadata?.full_name || profileData?.full_name || (userRole === "firm" ? "Dra. Carolina Jiménez Ariza" : "Dr. Roberto Mendoza Vargas");
      const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "JA";

      const activeProfile: Profile = {
        id: session.user.id,
        full_name: userName,
        initials,
        role: userRole,
        email: session.user.email,
        id_number: session.user.user_metadata?.id_number || (userRole === "firm" ? "T.P. 182.904 C.S.J." : "C.C. 79.432.891"),
        phone: session.user.user_metadata?.phone || "",
      };

      setProfile(activeProfile);

      const { data: caseData } = await supabase
        .from("cases")
        .select("*")
        .eq("client_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      setCaseRecord(caseData || getStoredCase());

      const caseIdToUse = caseData?.id || "case_001_restitucion";

      const [agendaRes, historyRes, docsRes, finRes] = await Promise.all([
        supabase.from("agenda_items").select("*").eq("case_id", caseIdToUse).order("event_date", { ascending: true }),
        supabase.from("history_items").select("*").eq("case_id", caseIdToUse).order("event_date", { ascending: false }),
        supabase.from("documents").select("*").eq("case_id", caseIdToUse),
        supabase.from("financial_records").select("*"),
      ]);

      if (!cancelled) {
        setAgenda(agendaRes.data && agendaRes.data.length > 0 ? agendaRes.data : getStoredAgenda());
        setHistory(historyRes.data && historyRes.data.length > 0 ? historyRes.data : getStoredHistory());
        setDocuments(docsRes.data && docsRes.data.length > 0 ? docsRes.data : getStoredDocuments());
        setFinances(finRes.data && finRes.data.length > 0 ? finRes.data : getStoredFinances());
        setLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleUpdateCase = (updated: CaseRecord) => {
    setCaseRecord(updated);
    saveStoredCase(updated);
  };

  const handleUpdateAgenda = (updated: AgendaItem[]) => {
    setAgenda(updated);
    saveStoredAgenda(updated);
  };

  const handleUpdateHistory = (updated: HistoryItem[]) => {
    setHistory(updated);
    saveStoredHistory(updated);
  };

  const handleUpdateDocuments = (updated: DocumentItem[]) => {
    setDocuments(updated);
    saveStoredDocuments(updated);
    if (caseRecord) {
      handleUpdateCase({
        ...caseRecord,
        documents_count: updated.length,
      });
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

  // Login de Usuario Real
  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setAuthError(error.message || "Credenciales incorrectas. Verifique su correo y contraseña.");
      } else if (data?.session) {
        setSession(data.session);
      }
    } catch (err: any) {
      setAuthError(err.message || "Error al intentar iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  // Registro de Nuevo Usuario Real
  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    if (!regFullName.trim() || !email.trim() || !password) {
      setAuthError("Por favor complete todos los campos obligatorios.");
      return;
    }

    if (password.length < 6) {
      setAuthError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: regFullName.trim(),
            role: regRole,
            id_number: regIdNumber.trim(),
            phone: regPhone.trim(),
          },
        },
      });

      if (error) {
        setAuthError(error.message || "No se pudo crear la cuenta. Intente con otro correo.");
      } else {
        setAuthSuccess(`¡Usuario registrado con éxito como ${regRole === "firm" ? "Abogado" : "Cliente"}!`);
        if (data?.session) {
          setSession(data.session);
        } else {
          setAuthMode("login");
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Error al registrar el usuario.");
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
              >
                <span>Procesos</span>
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
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(true)}
                  style={{
                    padding: "8px 12px",
                    background: "var(--brass)",
                    color: "var(--ink)",
                    fontWeight: 600,
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
                  <Sliders size={14} />
                  <span>Modificar Variables</span>
                </button>
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

            <p className="portal-private">
              Sesión verificada con Supabase Auth
            </p>
          </aside>

          <section className="portal-content" id="resumen">
            {loadingData && <p className="portal-loading-inline">Cargando información procesal…</p>}

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

            {!loadingData && !caseRecord && activeSection !== "economia" && activeSection !== "calculadora" && (
              <div className="portal-empty">
                <h2>Aún no hay un proceso asociado a su cuenta</h2>
                <p>En cuanto la firma registre su caso, aparecerá aquí automáticamente.</p>
                {isFirm && (
                  <button
                    type="button"
                    onClick={() => handleLoadTemplate("tpl_civil_restitucion")}
                    className="btn primary"
                    style={{ marginTop: "16px" }}
                  >
                    Cargar Caso de Prueba
                  </button>
                )}
              </div>
            )}

            {caseRecord && activeSection !== "economia" && activeSection !== "calculadora" && (
              <>
                <div className="content-header">
                  <div>
                    <p className="kicker">
                      {isFirm ? "Gestión Procesal del Despacho" : "Portal del Cliente Titular"}
                    </p>
                    <h1>
                      {activeSection === "resumen" && "Resumen General del Caso"}
                      {activeSection === "proceso" && "Fases y Detalles del Proceso"}
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
                    <div className="panel-title-row">
                      <div>
                        <p className="kicker">Expediente Oficial</p>
                        <h2>Documentos del Caso</h2>
                      </div>
                      {isFirm && (
                        <button type="button" onClick={() => setIsEditorOpen(true)}>
                          + Gestionar archivos
                        </button>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px", marginTop: "16px" }}>
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            padding: "16px",
                            background: "var(--parchment-deep)",
                            border: "1px solid var(--line)",
                            borderRadius: "4px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "12px",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "0.7rem", color: "var(--brass)", fontWeight: 600, textTransform: "uppercase" }}>
                                {doc.category}
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{doc.uploaded_at}</span>
                            </div>
                            <h4 style={{ margin: 0, fontSize: "0.9rem" }}>{doc.name}</h4>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: "10px" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{doc.file_size}</span>
                            <div style={{ display: "flex", gap: "8px" }}>
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
                                  fontSize: "0.75rem",
                                }}
                              >
                                Ver
                              </button>
                              <button
                                type="button"
                                onClick={() => alert(`Descargando copia legal: ${doc.name}`)}
                                style={{
                                  background: "var(--brass)",
                                  border: "none",
                                  color: "var(--ink)",
                                  fontWeight: 600,
                                  padding: "4px 10px",
                                  borderRadius: "3px",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                }}
                              >
                                Descargar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
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

        {/* Drawer modificador de caso (solo firma) */}
        <CaseEditorDrawer
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          caseRecord={caseRecord || getStoredCase()}
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

        {/* Modal de Documentos */}
        <DocumentModal
          document={selectedDocForPreview}
          caseRecord={caseRecord || getStoredCase()}
          onClose={() => setSelectedDocForPreview(null)}
        />

        {/* Modal de Arquitectura del Software (Ingeniería de Sistemas) */}
        <SystemArchitectureModal
          isOpen={isArchModalOpen}
          onClose={() => setIsArchModalOpen(false)}
        />
      </main>
    );
  }

  // ==========================================
  // VISTA DE LOGIN Y REGISTRO (SIN BOTONES DE DEMO)
  // ==========================================
  return (
    <main className="client-portal login-view">
      <button type="button" onClick={handleBack} className="portal-back login-back">
        ← Volver a la página principal
      </button>

      <section className="portal-card login-card" style={{ maxWidth: "440px" }}>
        <img src={logo} alt="Jiménez &amp; Ariza Asociados" className="portal-logo" />

        <p className="kicker">Acceso Seguro</p>
        <h1 style={{ fontSize: "1.45rem", marginBottom: "8px" }}>
          {authMode === "login" ? "Portal de Clientes & Despacho" : "Crear Cuenta en el Sistema"}
        </h1>
        <p className="portal-text" style={{ fontSize: "0.85rem", marginBottom: "16px" }}>
          {authMode === "login"
            ? "Ingrese con sus credenciales autorizadas para consultar el estado de sus procesos."
            : "Complete sus datos para habilitar su acceso al sistema de seguimiento procesal."}
        </p>

        {/* Pestañas: Iniciar Sesión vs Registrarse */}
        <div className="auth-nav-tabs">
          <button
            type="button"
            className={`auth-nav-tab ${authMode === "login" ? "active" : ""}`}
            onClick={() => {
              setAuthMode("login");
              setAuthError(null);
            }}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            className={`auth-nav-tab ${authMode === "register" ? "active" : ""}`}
            onClick={() => {
              setAuthMode("register");
              setAuthError(null);
            }}
          >
            Crear Cuenta
          </button>
        </div>

        {authSuccess && <p className="auth-success-msg">{authSuccess}</p>}
        {authError && <p className="portal-form-error">{authError}</p>}

        {authMode === "login" ? (
          /* FORMULARIO DE INICIO DE SESIÓN */
          <form className="portal-form" onSubmit={handleLogin}>
            <label>
              Correo electrónico
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@jalegal.com.co"
                required
              />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </label>

            <button className="btn primary" type="submit" disabled={submitting} style={{ marginTop: "8px" }}>
              {submitting ? "Verificando…" : "Ingresar al portal"}
            </button>
          </form>
        ) : (
          /* FORMULARIO DE REGISTRO CON SELECCIÓN DE ROL */
          <form className="portal-form" onSubmit={handleRegister}>
            <label>
              Nombre Completo *
              <input
                type="text"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="Dr. Nombre Apellido"
                required
              />
            </label>

            <label>
              Rol en el Sistema *
              <select
                className="auth-role-select"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as "client" | "firm")}
              >
                <option value="client">👤 Cliente (Titular del Proceso)</option>
                <option value="firm">⚖️ Abogado / Miembro de la Firma</option>
              </select>
            </label>

            <label>
              Documento de Identificación (C.C. o Tarjeta Profesional)
              <input
                type="text"
                value={regIdNumber}
                onChange={(e) => setRegIdNumber(e.target.value)}
                placeholder={regRole === "firm" ? "T.P. 182.904 C.S.J." : "C.C. 1.020.340.550"}
              />
            </label>

            <label>
              Correo electrónico *
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                required
              />
            </label>

            <label>
              Contraseña *
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </label>

            <button className="btn primary" type="submit" disabled={submitting} style={{ marginTop: "8px" }}>
              {submitting ? "Creando cuenta…" : "Registrar y Acceder"}
            </button>
          </form>
        )}

        <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--line)", textAlign: "left" }}>
          <p style={{ margin: "0 0 6px", fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Cuentas habilitadas por defecto:
          </p>
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "4px" }}>
            <div>
              <strong style={{ color: "var(--brass)" }}>Abogado:</strong> <code>abogado@jalegal.com.co</code> / Clave: <code>Abogado2026*</code>
            </div>
            <div>
              <strong style={{ color: "#38bdf8" }}>Cliente:</strong> <code>cliente@jalegal.com.co</code> / Clave: <code>Cliente2026*</code>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
