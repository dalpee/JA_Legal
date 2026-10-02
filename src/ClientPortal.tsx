import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import logo from "./assets/ja-legal-logo.svg";
import { supabase, switchUserSession, getStoredCase, saveStoredCase, getStoredAgenda, saveStoredAgenda, getStoredHistory, saveStoredHistory, getStoredDocuments, saveStoredDocuments, resetAllToDefault } from "./lib/supabaseClient";
import { defaultProfile, firmProfile, caseTemplates } from "./data/initialData";
import { Profile, CaseRecord, AgendaItem, HistoryItem, DocumentItem } from "./types/portal";
import { CaseEditorDrawer } from "./components/CaseEditorDrawer";
import { PresentationBanner } from "./components/PresentationBanner";
import { DocumentModal } from "./components/DocumentModal";
import { Sliders, Sparkles, Eye, CheckCircle2, ArrowRight, Scale, FileText } from "./components/icons";
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
  const [loadingData, setLoadingData] = useState(false);

  // Active section in portal
  const [activeSection, setActiveSection] = useState<"resumen" | "proceso" | "agenda" | "documentos" | "historial">("resumen");

  // Case modifier & presentation states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentItem | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sesión inicial + escucha de cambios (login/logout en cualquier pestaña)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setSession(data.session);
      setLoadingAuth(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, newSession: Session | null) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Carga perfil + caso + agenda + historial cuando hay sesión
  useEffect(() => {
    if (!session) {
      setProfile(null);
      setCaseRecord(null);
      setAgenda([]);
      setHistory([]);
      setDocuments([]);
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
      if (!profileData) {
        setProfile(defaultProfile);
      } else {
        setProfile(profileData);
      }

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

      const [agendaRes, historyRes, docsRes] = await Promise.all([
        supabase.from("agenda_items").select("*").eq("case_id", caseIdToUse).order("event_date", { ascending: true }),
        supabase.from("history_items").select("*").eq("case_id", caseIdToUse).order("event_date", { ascending: false }),
        supabase.from("documents").select("*").eq("case_id", caseIdToUse),
      ]);

      if (!cancelled) {
        setAgenda(agendaRes.data && agendaRes.data.length > 0 ? agendaRes.data : getStoredAgenda());
        setHistory(historyRes.data && historyRes.data.length > 0 ? historyRes.data : getStoredHistory());
        setDocuments(docsRes.data && docsRes.data.length > 0 ? docsRes.data : getStoredDocuments());
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
      setProfile(defaultProfile);
    }
  };

  const handleToggleRole = () => {
    const nextRole = profile?.role === "client" ? "firm" : "client";
    const nextProfile = nextRole === "client" ? defaultProfile : firmProfile;
    setProfile(nextProfile);
    switchUserSession(nextRole);
  };

  const handlePrintReport = () => {
    window.print();
  };

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setAuthError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setAuthError("Correo o contraseña incorrectos.");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const handleQuickDemoAccess = (role: "client" | "firm") => {
    setAuthError(null);
    const mockEmail = role === "firm" ? "abogado@jalegal.com.co" : "cliente@ejemplo.com";
    supabase.auth.signInWithPassword({ email: mockEmail, password: "demo" });
  };

  const handleBack = () => {
    if (onBackToSite) {
      onBackToSite();
    } else {
      window.location.hash = "#inicio";
    }
  };

  if (loadingAuth) {
    return <div className="portal-loading">Cargando…</div>;
  }

  if (session && profile) {
    return (
      <main className="portal-dashboard">
        {/* Top Simulation & Presentation Bar */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
              <span>Modificar Caso</span>
            </button>
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
                <small>{profile.role === "client" ? "Cliente" : "Firma"}</small>
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
            </nav>

            {/* Quick Demonstration CTA in Sidebar */}
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
                <Sparkles size={14} />
                <span>Simulador del Caso</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                Ajuste el porcentaje, audiencias y actuaciones para mostrar el avance en tiempo real.
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
                <span>Modificar Caso</span>
              </button>
            </div>

            <p className="portal-private">Sesión verificada con Supabase Auth</p>
          </aside>

          <section className="portal-content" id="resumen">
            {loadingData && <p className="portal-loading-inline">Cargando información del caso…</p>}

            {!loadingData && !caseRecord && (
              <div className="portal-empty">
                <h2>Aún no hay un proceso asociado a su cuenta</h2>
                <p>En cuanto la firma registre su caso, aparecerá aquí automáticamente.</p>
                <button
                  type="button"
                  onClick={() => handleLoadTemplate("tpl_civil_restitucion")}
                  className="btn primary"
                  style={{ marginTop: "16px" }}
                >
                  Cargar Caso de Ejemplo
                </button>
              </div>
            )}

            {caseRecord && (
              <>
                <div className="content-header">
                  <div>
                    <p className="kicker">Bienvenido de nuevo</p>
                    <h1>
                      {activeSection === "resumen" && "Resumen del caso"}
                      {activeSection === "proceso" && "Fases y Detalles del Proceso"}
                      {activeSection === "agenda" && "Calendario y Audiencias"}
                      {activeSection === "documentos" && "Expediente Digital"}
                      {activeSection === "historial" && "Historial de Actuaciones"}
                    </h1>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="status-pill">{caseRecord.status}</span>
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
                      <span>Modificar</span>
                    </button>
                  </div>
                </div>

                <article className="case-hero" id="proceso">
                  <div className="case-hero-main">
                    <p className="kicker">Proceso principal · {caseRecord.process_type || "Litigio General"}</p>
                    <h2>{caseRecord.title}</h2>

                    <dl className="case-details">
                      <div>
                        <dt>Radicado</dt>
                        <dd style={{ fontFamily: "monospace", color: "var(--brass-light)" }}>
                          {caseRecord.filed_date ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>Autoridad</dt>
                        <dd>{caseRecord.authority ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Abogado encargado</dt>
                        <dd>{caseRecord.lawyer ?? "—"}</dd>
                      </div>
                      <div>
                        <dt>Última actualización</dt>
                        <dd>{formatLong(caseRecord.last_update)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="case-hero-progress">
                    <div
                      className="progress-ring"
                      style={{ ["--pct" as string]: caseRecord.progress, cursor: "pointer" }}
                      onClick={() => setIsEditorOpen(true)}
                      title="Haga clic para modificar el avance"
                    >
                      <span>{caseRecord.progress}%</span>
                    </div>
                    <p>Avance general del proceso</p>
                    <button
                      type="button"
                      onClick={() => setIsEditorOpen(true)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--brass)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Ajustar %
                    </button>
                  </div>
                </article>

                <div className="portal-stats">
                  <article style={{ cursor: "pointer" }} onClick={() => setActiveSection("proceso")}>
                    <span>Procesos activos</span>
                    <strong>1</strong>
                    <small>En seguimiento</small>
                  </article>
                  <article style={{ cursor: "pointer" }} onClick={() => setActiveSection("agenda")}>
                    <span>Próximo evento</span>
                    <strong>
                      {agenda[0] ? `${formatDay(agenda[0].event_date).day} ${formatDay(agenda[0].event_date).month}` : "—"}
                    </strong>
                    <small>{agenda[0]?.title ?? "Sin eventos próximos"}</small>
                  </article>
                  <article>
                    <span>Saldo pendiente</span>
                    <strong style={{ color: "var(--sage)" }}>${caseRecord.balance.toLocaleString("es-CO")}</strong>
                    <small>Honorarios fijados</small>
                  </article>
                  <article style={{ cursor: "pointer" }} onClick={() => setActiveSection("documentos")}>
                    <span>Documentos</span>
                    <strong>{documents.length || caseRecord.documents_count}</strong>
                    <small>Disponibles</small>
                  </article>
                </div>

                {/* TAB: RESUMEN */}
                {activeSection === "resumen" && (
                  <div className="portal-main-grid">
                    <article className="portal-panel" id="agenda">
                      <div className="panel-title-row">
                        <div>
                          <p className="kicker">Próximamente</p>
                          <h2>Agenda</h2>
                        </div>
                        <button type="button" onClick={() => setActiveSection("agenda")}>
                          Ver calendario
                        </button>
                      </div>

                      <div className="agenda-list">
                        {agenda.length === 0 && <p className="portal-empty-note">No hay eventos programados.</p>}
                        {agenda.slice(0, 3).map((item) => {
                          const { day, month } = formatDay(item.event_date);
                          return (
                            <div className="agenda-item" key={item.id}>
                              <time>
                                <strong>{day}</strong>
                                <span>{month}</span>
                              </time>
                              <div>
                                <h3>{item.title}</h3>
                                <p>{item.detail}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(true)}
                        style={{
                          marginTop: "12px",
                          padding: "8px",
                          background: "var(--parchment-deep)",
                          border: "1px dashed var(--brass)",
                          color: "var(--brass-light)",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        + Modificar o agendar audiencias
                      </button>
                    </article>

                    <article className="portal-panel history-panel" id="historial">
                      <div className="panel-title-row">
                        <div>
                          <p className="kicker">Historial</p>
                          <h2>Últimas actuaciones</h2>
                        </div>
                        <button type="button" onClick={() => setActiveSection("historial")}>
                          Ver proceso completo
                        </button>
                      </div>

                      <div className="timeline">
                        {history.length === 0 && <p className="portal-empty-note">Aún no hay actuaciones registradas.</p>}
                        {history.slice(0, 4).map((item) => (
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

                      <button
                        type="button"
                        onClick={() => setIsEditorOpen(true)}
                        style={{
                          marginTop: "12px",
                          padding: "8px",
                          background: "var(--parchment-deep)",
                          border: "1px dashed var(--brass)",
                          color: "var(--brass-light)",
                          borderRadius: "4px",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        + Agregar actuación procesal
                      </button>
                    </article>
                  </div>
                )}

                {/* TAB: PROCESO */}
                {activeSection === "proceso" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <article className="portal-panel">
                      <div className="panel-title-row">
                        <div>
                          <p className="kicker">Estructura Procesal</p>
                          <h2>Fases del Litigio</h2>
                        </div>
                        <button type="button" onClick={() => setIsEditorOpen(true)}>
                          Modificar fases en vivo
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "14px" }}>
                        {[
                          { step: "Fase 1", name: "Radicación y Admisión", desc: "Presentación de la demanda y auto admisorio.", completed: caseRecord.progress >= 25 },
                          { step: "Fase 2", name: "Notificación y Cautelares", desc: "Medidas cautelares de embargo y traslado a contraparte.", completed: caseRecord.progress >= 50 },
                          { step: "Fase 3", name: "Pruebas y Audiencia", desc: "Recepción de testimonios, peritajes y alegatos.", completed: caseRecord.progress >= 75 },
                          { step: "Fase 4", name: "Sentencia y Ejecución", desc: "Emisión de fallo definitivo y liquidación de costas.", completed: caseRecord.progress >= 100 },
                        ].map((phase, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: "16px",
                              background: phase.completed ? "rgba(127, 174, 143, 0.08)" : "var(--parchment-deep)",
                              border: phase.completed ? "1px solid var(--sage)" : "1px solid var(--line)",
                              borderRadius: "4px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--brass)", fontWeight: 600 }}>{phase.step}</span>
                              {phase.completed && <CheckCircle2 size={16} color="var(--sage)" />}
                            </div>
                            <h4 style={{ margin: "0 0 6px", fontSize: "0.95rem" }}>{phase.name}</h4>
                            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{phase.desc}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>
                )}

                {/* TAB: AGENDA COMPLETA */}
                {activeSection === "agenda" && (
                  <article className="portal-panel">
                    <div className="panel-title-row">
                      <div>
                        <p className="kicker">Calendario</p>
                        <h2>Todas las Audiencias y Fechas de Términos</h2>
                      </div>
                      <button type="button" onClick={() => setIsEditorOpen(true)}>
                        + Agregar evento en el editor
                      </button>
                    </div>

                    <div className="agenda-list" style={{ marginTop: "14px" }}>
                      {agenda.map((item) => {
                        const { day, month } = formatDay(item.event_date);
                        return (
                          <div className="agenda-item" key={item.id}>
                            <time>
                              <strong>{day}</strong>
                              <span>{month}</span>
                            </time>
                            <div>
                              <h3>{item.title}</h3>
                              <p>{item.detail}</p>
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
                      <button type="button" onClick={() => setIsEditorOpen(true)}>
                        + Gestionar archivos
                      </button>
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
                                onClick={() => alert(`Descargando copia legal de: ${doc.name}`)}
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
                      <button type="button" onClick={() => setIsEditorOpen(true)}>
                        + Agregar actuación
                      </button>
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

        {/* Live Case Modifier Drawer */}
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

        {/* Document Modal */}
        <DocumentModal
          document={selectedDocForPreview}
          caseRecord={caseRecord || getStoredCase()}
          onClose={() => setSelectedDocForPreview(null)}
        />
      </main>
    );
  }

  return (
    <main className="client-portal login-view">
      <button type="button" onClick={handleBack} className="portal-back login-back">
        ← Volver a la página
      </button>

      <section className="portal-card login-card">
        <img src={logo} alt="Jiménez &amp; Ariza Asociados" className="portal-logo" />

        <p className="kicker">Acceso privado</p>
        <h1>Seguimiento y gestión de procesos</h1>
        <p className="portal-text">
          Consulte el estado de su caso, próximas actuaciones, documentos y novedades compartidas por la firma.
        </p>

        {/* Quick Demo Access Bar */}
        <div
          style={{
            marginBottom: "20px",
            padding: "14px",
            borderRadius: "4px",
            background: "rgba(217, 181, 106, 0.08)",
            border: "1px solid var(--brass)",
            textAlign: "left",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--brass)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Sparkles size={14} />
            Demostración para Clientes
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleQuickDemoAccess("client")}
              style={{
                padding: "8px 10px",
                borderRadius: "3px",
                background: "var(--brass)",
                color: "var(--ink)",
                fontWeight: 600,
                fontSize: "0.78rem",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <span>Ver como Cliente</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoAccess("firm")}
              style={{
                padding: "8px 10px",
                borderRadius: "3px",
                background: "var(--parchment-deep)",
                border: "1px solid var(--line)",
                color: "var(--text-bright)",
                fontWeight: 500,
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <Scale size={14} color="var(--brass)" />
              <span>Acceso Firma</span>
            </button>
          </div>
        </div>

        <form className="portal-form" onSubmit={handleLogin}>
          <label>
            Correo electrónico
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
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

          {authError && <p className="portal-form-error">{authError}</p>}

          <button className="btn primary" type="submit" disabled={submitting}>
            {submitting ? "Ingresando…" : "Ingresar al portal"}
          </button>
        </form>

        <p className="portal-footnote">
          ¿No tiene acceso todavía? Comuníquese con la firma para que habiliten su cuenta.
        </p>
      </section>
    </main>
  );
}
