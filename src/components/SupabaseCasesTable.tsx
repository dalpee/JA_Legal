import React, { useState, useEffect, useMemo } from "react";
import { CaseRecord, Profile } from "../types/portal";
import {
  supabase,
  getSupabaseConfig,
  fetchAllCasesFromDatabase,
  uploadDocumentToSupabaseStorage,
  getStoredCases,
  syncCaseToDatabase,
} from "../lib/supabaseClient";
import { caseTemplates } from "../data/initialData";

interface SupabaseCasesTableProps {
  onSelectCase: (caseRecord: CaseRecord) => void;
  onNavigateToSection?: (section: "resumen" | "proceso" | "agenda" | "documentos" | "historial" | "economia") => void;
  currentProfile?: Profile | null;
  isFirmUser?: boolean;
}

const fieldStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--parchment-deep)",
  border: "1px solid var(--line)",
  borderRadius: "4px",
  color: "var(--text-bright)",
  fontSize: "0.8rem",
};

const filterSelectStyle: React.CSSProperties = {
  padding: "8px 12px",
  background: "var(--ink-soft)",
  border: "1px solid var(--line)",
  borderRadius: "4px",
  color: "var(--text-bright)",
  fontSize: "0.8rem",
  cursor: "pointer",
};

const metricBox: React.CSSProperties = {
  background: "var(--parchment-deep)",
  padding: "10px 14px",
  borderRadius: "4px",
  border: "1px solid var(--line)",
};

export function SupabaseCasesTable({
  onSelectCase,
  onNavigateToSection,
  currentProfile,
  isFirmUser = false,
}: SupabaseCasesTableProps) {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"last_update" | "progress" | "title" | "radicado">("last_update");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Modal de subida a Supabase Storage
  const [targetCaseForUpload, setTargetCaseForUpload] = useState<CaseRecord | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("Auto / Providencia");
  const [docStatus, setDocStatus] = useState("Oficial");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
    source?: string;
  } | null>(null);

  const supabaseConfig = getSupabaseConfig();
  const isConnected = supabaseConfig.isConfigured;

  // Carga los casos. silent = no muestra el indicador de carga (para actualizaciones en vivo)
  const loadCasesFromSupabase = async (isManualRefresh = false, silent = false) => {
    if (!silent) {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
    }

    try {
      if (isConnected) {
        let query = supabase.from("cases").select("*");

        if (!isFirmUser && currentProfile?.email) {
          query = query.or(
            `client_email.eq.${currentProfile.email.toLowerCase().trim()},client_id.eq.${currentProfile.id}`
          );
        }

        const { data, error } = await query.order("last_update", { ascending: false });

        if (!error && data) {
          setCases(data); // aunque venga vacío: ya no resucita datos locales
          return;
        }
      }

      // Respaldo local solo si no hay conexión o hubo error
      const localData = await fetchAllCasesFromDatabase();
      if (!isFirmUser && currentProfile?.email) {
        const filtered = localData.filter(
          (c) =>
            c.client_email?.toLowerCase() === currentProfile.email!.toLowerCase() ||
            c.client_id === currentProfile.id
        );
        setCases(filtered);
      } else {
        setCases(localData.length > 0 ? localData : getStoredCases());
      }
    } catch (err) {
      console.warn("Aviso al consultar Supabase cases:", err);
      setCases(getStoredCases());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCasesFromSupabase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProfile?.email, isFirmUser, isConnected]);

  // Actualización automática cuando cambia la tabla cases
  useEffect(() => {
    if (!isConnected) return;
    const channel = supabase
      .channel("cases-table-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "cases" }, () =>
        loadCasesFromSupabase(false, true)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isFirmUser, currentProfile?.email]);

  const handleSort = (field: "last_update" | "progress" | "title" | "radicado") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const filteredCases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return cases
      .filter((c) => {
        const title = (c.title || "").toLowerCase();
        const radicado = (c.radicado || c.id || "").toLowerCase();
        const clientName = (c.client_name || "").toLowerCase();
        const clientEmail = (c.client_email || "").toLowerCase();
        const authority = (c.authority || "").toLowerCase();
        const lawyer = (c.lawyer || "").toLowerCase();

        const matchSearch =
          !term ||
          title.includes(term) ||
          radicado.includes(term) ||
          clientName.includes(term) ||
          clientEmail.includes(term) ||
          authority.includes(term) ||
          lawyer.includes(term);

        const matchStatus = statusFilter === "all" || (c.status || "").toLowerCase().includes(statusFilter.toLowerCase());
        const matchBranch = branchFilter === "all" || (c.process_type || "").toLowerCase().includes(branchFilter.toLowerCase());

        return matchSearch && matchStatus && matchBranch;
      })
      .sort((a, b) => {
        let valA: any = (a as any)[sortBy] || "";
        let valB: any = (b as any)[sortBy] || "";

        if (sortBy === "progress") {
          valA = Number(a.progress) || 0;
          valB = Number(b.progress) || 0;
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [cases, searchTerm, statusFilter, branchFilter, sortBy, sortOrder]);

  const openUploadModal = (c: CaseRecord) => {
    setTargetCaseForUpload(c);
    setSelectedFile(null);
    setDocTitle("");
    setUploadResult(null);
    setUploadProgress(null);
  };

  const closeUploadModal = () => {
    setTargetCaseForUpload(null);
    setSelectedFile(null);
    setDocTitle("");
    setUploadResult(null);
    setUploadProgress(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!docTitle.trim()) setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCaseForUpload || !selectedFile) {
      alert("Por favor seleccione un archivo para adjuntar.");
      return;
    }

    setUploading(true);
    setUploadProgress(20);
    setUploadResult(null);

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev && prev < 85 ? prev + 15 : prev));
    }, 200);

    try {
      const baseTitle = docTitle.trim() || selectedFile.name;
      const finalName = /\.[a-z0-9]{2,5}$/i.test(baseTitle)
        ? baseTitle
        : `${baseTitle}.${selectedFile.name.split(".").pop() || "pdf"}`;

      const res = await uploadDocumentToSupabaseStorage(targetCaseForUpload.id, selectedFile, finalName, docCategory, docStatus);

      setUploadProgress(100);
      setUploadResult({ success: res.success, message: res.message, url: res.storageUrl, source: res.source });
      loadCasesFromSupabase(true, true);
    } catch (err: any) {
      setUploadResult({ success: false, message: err.message || "Error al subir el documento a Supabase Storage." });
    } finally {
      clearInterval(progressTimer);
      setUploading(false);
    }
  };

  const handleSeedDemoCases = async () => {
    setLoading(true);
    try {
      const demoList: CaseRecord[] = caseTemplates.map((t, idx) => ({
        id: `case_${t.id}_${Date.now()}_${idx}`,
        client_id: currentProfile?.id || "usr_client_01",
        client_email: currentProfile?.email || "cliente@ejemplo.com",
        client_name: currentProfile?.full_name || "Cliente Titular",
        title: t.caseData.title,
        process_type: t.caseData.process_type,
        status: t.caseData.status,
        progress: t.caseData.progress,
        balance: t.caseData.balance,
        total_fees: t.caseData.total_fees,
        authority: t.caseData.authority,
        city: t.caseData.city,
        lawyer: t.caseData.lawyer,
        observations: t.caseData.observations,
        current_phase: t.caseData.current_phase,
        radicado: `11001-31-03-0${idx + 1}4-2024-00${idx + 1}82-00`,
        filed_date: t.caseData.filed_date || "2024-03-15",
        documents_count: t.caseData.documents_count || 0,
        last_update: new Date().toISOString(),
      }));

      for (const c of demoList) {
        await syncCaseToDatabase(c);
      }
      await loadCasesFromSupabase(true);
    } catch (e) {
      console.warn("Error cargando casos de prueba:", e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("activo") || s.includes("admitid")) {
      return { bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e", text: "#4ade80" };
    }
    if (s.includes("audiencia") || s.includes("tramite") || s.includes("trámite")) {
      return { bg: "rgba(56, 189, 248, 0.15)", border: "#0284c7", text: "#38bdf8" };
    }
    if (s.includes("fallo") || s.includes("sentencia") || s.includes("favorable")) {
      return { bg: "rgba(234, 179, 8, 0.15)", border: "#eab308", text: "#facc15" };
    }
    if (s.includes("finaliz") || s.includes("terminad")) {
      return { bg: "rgba(148, 163, 184, 0.15)", border: "#64748b", text: "#94a3b8" };
    }
    return { bg: "rgba(217, 181, 106, 0.15)", border: "var(--brass)", text: "var(--brass-light)" };
  };

  const hasFilters = Boolean(searchTerm) || statusFilter !== "all" || branchFilter !== "all";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* CABECERA */}
      <article
        style={{
          background: "var(--ink-soft)",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "20px 24px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: "var(--brass)" }}>
                Supabase Database &amp; Storage
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  background: isConnected ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)",
                  color: isConnected ? "#4ade80" : "#facc15",
                  border: `1px solid ${isConnected ? "rgba(34, 197, 94, 0.35)" : "rgba(234, 179, 8, 0.35)"}`,
                }}
              >
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isConnected ? "#4ade80" : "#facc15" }} />
                {isConnected ? "Conectado en vivo (se actualiza solo)" : "Modo Local / Caché Activa"}
              </span>
            </div>

            <h2 style={{ margin: "2px 0 6px", fontSize: "1.35rem", color: "var(--text-bright)", fontFamily: "var(--font-heading)" }}>
              {isFirmUser ? "Monitoreo & Estado de Procesos Judiciales" : "Mis Procesos & Expedientes Activos"}
            </h2>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", maxWidth: "680px" }}>
              Consulte en tiempo real la tabla <code>cases</code>. Supervise las fases procesales, el porcentaje de avance y adjunte documentación oficial al bucket <code>case-documents</code>.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            {isFirmUser && cases.length > 0 && (
              <button
                type="button"
                onClick={() => openUploadModal(cases[0])}
                style={{
                  background: "var(--brass)",
                  color: "var(--ink)",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
                title="Subir archivo digital a Supabase Storage y asociarlo al expediente"
              >
                📎 + Adjuntar Documento (Storage)
              </button>
            )}

            <button
              type="button"
              onClick={() => loadCasesFromSupabase(true)}
              disabled={refreshing}
              style={{
                background: "var(--parchment-deep)",
                color: "var(--brass-light)",
                border: "1px solid var(--brass)",
                padding: "8px 16px",
                borderRadius: "4px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Recargar datos directamente de la base de datos"
            >
              🔄 {refreshing ? "Consultando…" : "Recargar"}
            </button>
          </div>
        </div>

        {/* MÉTRICAS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginTop: "18px", borderTop: "1px solid var(--line)", paddingTop: "16px" }}>
          <div style={metricBox}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Procesos</span>
            <strong style={{ fontSize: "1.3rem", display: "block", color: "var(--brass-light)", marginTop: "2px" }}>{cases.length}</strong>
          </div>
          <div style={metricBox}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>En Trámite Activo</span>
            <strong style={{ fontSize: "1.3rem", display: "block", color: "#38bdf8", marginTop: "2px" }}>
              {cases.filter((c) => (c.status || "").toLowerCase().includes("activo") || (c.status || "").toLowerCase().includes("audiencia")).length}
            </strong>
          </div>
          <div style={metricBox}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Avance Promedio</span>
            <strong style={{ fontSize: "1.3rem", display: "block", color: "#4ade80", marginTop: "2px" }}>
              {cases.length > 0 ? Math.round(cases.reduce((acc, c) => acc + (Number(c.progress) || 0), 0) / cases.length) : 0}%
            </strong>
          </div>
          <div style={metricBox}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Documentos</span>
            <strong style={{ fontSize: "1.3rem", display: "block", color: "var(--brass)", marginTop: "2px" }}>
              {cases.reduce((acc, c) => acc + (Number(c.documents_count) || 0), 0)}
            </strong>
          </div>
        </div>
      </article>

      {/* BÚSQUEDA Y FILTROS */}
      <div
        style={{
          background: "var(--parchment-deep)",
          border: "1px solid var(--line)",
          borderRadius: "6px",
          padding: "14px 18px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: "1 1 320px" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por radicado, título, cliente o despacho…"
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                background: "var(--ink-soft)",
                border: "1px solid var(--line)",
                borderRadius: "4px",
                color: "var(--text-bright)",
                fontSize: "0.82rem",
              }}
            />
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", opacity: 0.6 }}>🔍</span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "0.85rem", cursor: "pointer" }}
              >
                ✕
              </button>
            )}
          </div>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={filterSelectStyle}>
            <option value="all">Todos los Estados</option>
            <option value="Activo">Activo / En Trámite</option>
            <option value="Audiencia">En Audiencia</option>
            <option value="Sentencia">Sentencia / Fallo</option>
            <option value="Finalizado">Finalizado / Archivado</option>
          </select>

          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={filterSelectStyle}>
            <option value="all">Todas las Ramas</option>
            <option value="Civil">Derecho Civil</option>
            <option value="Comercial">Derecho Comercial</option>
            <option value="Laboral">Derecho Laboral</option>
            <option value="Familia">Derecho de Familia</option>
            <option value="Administrativo">Contencioso Administrativo</option>
          </select>
        </div>

        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Mostrando <strong>{filteredCases.length}</strong> de {cases.length} procesos
        </div>
      </div>

      {/* TABLA */}
      {loading ? (
        <div style={{ padding: "48px 24px", textAlign: "center", background: "var(--ink-soft)", borderRadius: "8px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "2rem", display: "block", marginBottom: "12px" }}>⚖️</span>
          <p style={{ margin: 0, color: "var(--brass-light)", fontSize: "0.9rem", fontWeight: 600 }}>Consultando procesos…</p>
        </div>
      ) : filteredCases.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", background: "var(--ink-soft)", borderRadius: "8px", border: "1px dashed var(--line)" }}>
          <span style={{ fontSize: "2.4rem", display: "block", marginBottom: "10px" }}>📂</span>
          <h3 style={{ margin: "0 0 6px", color: "var(--text-bright)", fontSize: "1.1rem" }}>
            {hasFilters ? "No se encontraron procesos con los filtros aplicados" : "No hay procesos registrados aún"}
          </h3>
          <p style={{ margin: "0 auto 16px", maxWidth: "460px", color: "var(--text-muted)", fontSize: "0.82rem" }}>
            {isFirmUser
              ? "Como abogado titular puede registrar el primer caso y vincularlo al cliente con su correo electrónico."
              : "Su abogado titular registrará sus procesos próximamente. Puede solicitar una actualización de su expediente vía WhatsApp."}
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            {isFirmUser && cases.length === 0 && (
              <button
                type="button"
                onClick={handleSeedDemoCases}
                style={{ background: "var(--brass)", color: "var(--ink)", border: "none", borderRadius: "4px", padding: "9px 18px", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
              >
                🚀 Cargar 3 Casos Judiciales de Prueba
              </button>
            )}
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setBranchFilter("all");
                }}
                style={{ background: "var(--brass)", color: "var(--ink)", border: "none", borderRadius: "4px", padding: "8px 16px", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--ink-soft)", border: "1px solid var(--line)", borderRadius: "8px", overflowX: "auto", boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--parchment-deep)", borderBottom: "1px solid var(--line)", color: "var(--text-muted)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th onClick={() => handleSort("radicado")} style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }} title="Ordenar por Radicado">
                  Radicado Judicial {sortBy === "radicado" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("title")} style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none" }} title="Ordenar por Título">
                  Proceso &amp; Rama {sortBy === "title" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th style={{ padding: "12px 14px" }}>Cliente Titular</th>
                <th style={{ padding: "12px 14px" }}>Estado Procesal</th>
                <th onClick={() => handleSort("progress")} style={{ padding: "12px 14px", cursor: "pointer", userSelect: "none", minWidth: "140px" }} title="Ordenar por Avance">
                  Avance {sortBy === "progress" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                </th>
                <th style={{ padding: "12px 14px" }}>Despacho &amp; Ciudad</th>
                <th style={{ padding: "12px 14px", textAlign: "center" }}>Docs</th>
                <th style={{ padding: "12px 14px", textAlign: "right" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map((c) => {
                const badge = getStatusBadgeStyle(c.status);
                const isExpanded = expandedRowId === c.id;
                const progress = Number(c.progress) || 0;

                return (
                  <React.Fragment key={c.id}>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--line)",
                        background: isExpanded ? "rgba(217, 181, 106, 0.05)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <code
                          style={{
                            background: "var(--parchment-deep)",
                            color: "var(--brass-light)",
                            padding: "3px 7px",
                            borderRadius: "3px",
                            fontSize: "0.75rem",
                            border: "1px solid var(--line)",
                            fontWeight: 600,
                            display: "inline-block",
                          }}
                        >
                          {c.radicado || c.id}
                        </code>
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block", marginTop: "3px" }}>
                          Act: {c.last_update ? String(c.last_update).slice(0, 10) : "Hoy"}
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            fontSize: "0.68rem",
                            background: "rgba(217, 181, 106, 0.15)",
                            color: "var(--brass)",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            display: "inline-block",
                            marginBottom: "3px",
                          }}
                        >
                          {c.process_type}
                        </span>
                        <strong style={{ display: "block", color: "var(--text-bright)", fontSize: "0.85rem", lineHeight: 1.3 }}>{c.title}</strong>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <span style={{ display: "block", color: "var(--text-bright)", fontWeight: 600 }}>{c.client_name || "Cliente Asignado"}</span>
                        <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{c.client_email || "Sin correo"}</small>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "3px 9px",
                            borderRadius: "12px",
                            fontWeight: 700,
                            display: "inline-block",
                            background: badge.bg,
                            border: `1px solid ${badge.border}`,
                            color: badge.text,
                            whiteSpace: "nowrap",
                          }}
                        >
                          ● {c.status || "Activo"}
                        </span>
                        {c.current_phase && (
                          <span style={{ display: "block", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "3px" }}>{c.current_phase}</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <div style={{ marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: progress >= 75 ? "#4ade80" : "var(--brass-light)" }}>{progress}%</span>
                        </div>
                        <div style={{ height: "6px", width: "100%", background: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ width: `${progress}%`, height: "100%", background: progress >= 75 ? "#4ade80" : "var(--brass)", borderRadius: "3px" }} />
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                        <span style={{ color: "var(--text-bright)", display: "block" }}>{c.authority || "Juzgado por asignar"}</span>
                        <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>{c.city || "Bogotá D.C."}</small>
                      </td>

                      <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "middle" }}>
                        <span
                          style={{
                            background: (c.documents_count || 0) > 0 ? "rgba(56, 189, 248, 0.15)" : "var(--parchment-deep)",
                            color: (c.documents_count || 0) > 0 ? "#38bdf8" : "var(--text-muted)",
                            border: "1px solid var(--line)",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          📄 {c.documents_count || 0}
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => openUploadModal(c)}
                            style={{
                              background: "rgba(217, 181, 106, 0.15)",
                              border: "1px solid var(--brass)",
                              color: "var(--brass-light)",
                              padding: "5px 10px",
                              borderRadius: "4px",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title="Subir documento digital a Supabase Storage (PDF, Word, imagen)"
                          >
                            📎 Adjuntar Doc
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onSelectCase(c);
                              if (onNavigateToSection) onNavigateToSection("resumen");
                            }}
                            style={{ background: "rgba(56, 189, 248, 0.12)", border: "1px solid rgba(56, 189, 248, 0.3)", color: "#38bdf8", padding: "5px 9px", borderRadius: "4px", fontSize: "0.74rem", fontWeight: 600, cursor: "pointer" }}
                            title="Ver cuaderno completo, audiencias y documentos"
                          >
                            👁️ Ver
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedRowId(isExpanded ? null : c.id)}
                            style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text-muted)", padding: "5px 7px", borderRadius: "4px", fontSize: "0.72rem", cursor: "pointer" }}
                            title={isExpanded ? "Ocultar ficha" : "Ver ficha rápida"}
                          >
                            {isExpanded ? "▲" : "▼"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr style={{ background: "rgba(217, 181, 106, 0.04)", borderBottom: "1px solid var(--line)" }}>
                        <td colSpan={8} style={{ padding: "14px 20px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                            <div>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Resumen Procesal &amp; Hechos</span>
                              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "var(--text-bright)", lineHeight: 1.45 }}>
                                {c.observations || "Expediente formal activo tramitado por el despacho J&A Legal."}
                              </p>
                            </div>

                            <div>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Abogado Responsable</span>
                              <strong style={{ fontSize: "0.85rem", color: "var(--brass-light)" }}>{c.lawyer || "Por asignar"}</strong>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>
                                Ciudad: {c.city || "Bogotá D.C."}
                              </span>
                            </div>

                            <div>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Control Financiero &amp; Honorarios</span>
                              <span style={{ fontSize: "0.85rem", color: "#4ade80", fontWeight: 700, display: "block" }}>
                                Total: ${(Number(c.total_fees) || 0).toLocaleString("es-CO")} COP
                              </span>
                              <small style={{ color: Number(c.balance) > 0 ? "#facc15" : "#4ade80", fontSize: "0.72rem" }}>
                                Saldo pendiente: ${(Number(c.balance) || 0).toLocaleString("es-CO")} COP
                              </small>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectCase(c);
                                  if (onNavigateToSection) onNavigateToSection("documentos");
                                }}
                                style={{ background: "var(--brass)", color: "var(--ink)", border: "none", padding: "7px 14px", borderRadius: "4px", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                              >
                                Ir al Expediente Digital →
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: ADJUNTAR DOCUMENTO (SUPABASE STORAGE) */}
      {targetCaseForUpload && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            backgroundColor: "rgba(10, 15, 29, 0.85)",
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            style={{
              background: "var(--ink-soft)",
              border: "1px solid var(--brass)",
              borderRadius: "8px",
              padding: "24px 28px",
              maxWidth: "540px",
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.7)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.68rem", color: "var(--brass)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                  Supabase Storage · Bucket: case-documents
                </span>
                <h3 style={{ margin: "2px 0 4px", fontSize: "1.2rem", color: "var(--text-bright)", fontFamily: "var(--font-heading)" }}>
                  Adjuntar Documento Procesal
                </h3>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Expediente: <strong style={{ color: "var(--brass-light)" }}>{targetCaseForUpload.title}</strong> · Radicado:{" "}
                  {targetCaseForUpload.radicado || targetCaseForUpload.id}
                </p>
              </div>

              <button
                type="button"
                onClick={closeUploadModal}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {uploadResult && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                  fontSize: "0.82rem",
                  background: uploadResult.success ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  border: `1px solid ${uploadResult.success ? "#22c55e" : "#ef4444"}`,
                  color: uploadResult.success ? "#4ade80" : "#f87171",
                  lineHeight: 1.45,
                }}
              >
                <strong>{uploadResult.success ? "✓ ¡Éxito!" : "✕ Error al subir:"}</strong> {uploadResult.message}
                {uploadResult.url && uploadResult.source === "supabase" && (
                  <div style={{ marginTop: "6px" }}>
                    <a href={uploadResult.url} target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "underline", fontSize: "0.78rem" }}>
                      🔗 Ver / Descargar archivo subido
                    </a>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {cases.length > 1 && (
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-bright)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                    Asignar al Expediente / Proceso de Destino:
                  </label>
                  <select
                    value={targetCaseForUpload.id}
                    onChange={(e) => {
                      const found = cases.find((c) => c.id === e.target.value);
                      if (found) setTargetCaseForUpload(found);
                    }}
                    style={fieldStyle}
                  >
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.radicado || c.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-bright)", display: "block", marginBottom: "6px", fontWeight: 600 }}>
                  Archivo Digital (PDF, Word DOCX/DOC, Imagen PNG/JPG) *
                </label>
                <div
                  style={{ border: "2px dashed var(--line)", borderRadius: "6px", padding: "18px", textAlign: "center", background: "var(--parchment-deep)", cursor: "pointer" }}
                  onClick={() => window.document.getElementById("supabase-file-input")?.click()}
                >
                  <input
                    id="supabase-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />

                  {selectedFile ? (
                    <div>
                      <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "6px" }}>📄</span>
                      <strong style={{ fontSize: "0.85rem", color: "var(--text-bright)", display: "block" }}>{selectedFile.name}</strong>
                      <span style={{ fontSize: "0.75rem", color: "var(--brass-light)" }}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Listo para subir
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "6px" }}>☁️</span>
                      <strong style={{ fontSize: "0.85rem", color: "var(--brass-light)", display: "block" }}>Haga clic para seleccionar un documento</strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Demanda, Autos, Sentencias, Memoriales</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-bright)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                  Nombre Formal del Documento *
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Ej. Auto_Admisorio_Demanda_2026"
                  style={{ ...fieldStyle, padding: "9px 12px", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-bright)", display: "block", marginBottom: "4px", fontWeight: 600 }}>Categoría Procesal</label>
                  <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)} style={fieldStyle}>
                    <option value="Auto / Providencia">Auto / Providencia</option>
                    <option value="Demanda / Poder">Demanda / Poder</option>
                    <option value="Memorial de Contestación">Memorial de Contestación</option>
                    <option value="Pruebas / Dictámenes">Pruebas / Dictámenes</option>
                    <option value="Sentencia / Fallo">Sentencia / Fallo</option>
                    <option value="Medidas Cautelares">Medidas Cautelares</option>
                    <option value="Liquidación de Costas">Liquidación de Costas</option>
                    <option value="Contrato / Factura">Contrato / Factura</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-bright)", display: "block", marginBottom: "4px", fontWeight: 600 }}>Estado de Cotejo</label>
                  <select value={docStatus} onChange={(e) => setDocStatus(e.target.value)} style={fieldStyle}>
                    <option value="Oficial">Oficial</option>
                    <option value="Cotejado y Verificado">Cotejado y Verificado</option>
                    <option value="En Revisión del Despacho">En Revisión del Despacho</option>
                    <option value="Borrador Preparatorio">Borrador Preparatorio</option>
                  </select>
                </div>
              </div>

              {uploading && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "var(--brass)", marginBottom: "4px" }}>
                    <span>Subiendo…</span>
                    <span>{uploadProgress || 20}%</span>
                  </div>
                  <div style={{ height: "6px", width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${uploadProgress || 20}%`, height: "100%", background: "var(--brass)", transition: "width 0.3s ease" }} />
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={closeUploadModal}
                  style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text-muted)", padding: "8px 16px", borderRadius: "4px", fontSize: "0.82rem", cursor: "pointer" }}
                >
                  {uploadResult?.success ? "Cerrar" : "Cancelar"}
                </button>

                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  style={{
                    background: "var(--brass)",
                    color: "var(--ink)",
                    border: "none",
                    padding: "8px 22px",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(217, 181, 106, 0.25)",
                    opacity: uploading || !selectedFile ? 0.6 : 1,
                  }}
                >
                  {uploading ? "Subiendo…" : "Subir Documento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
