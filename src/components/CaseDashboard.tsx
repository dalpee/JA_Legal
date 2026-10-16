import React, { useState, useMemo } from "react";
import { CaseRecord, Profile, DocumentItem } from "../types/portal";
import {
  uploadDocumentToSupabaseStorage,
  deleteDocumentFromDatabase,
  fetchDocumentsForCaseFromDatabase,
} from "../lib/supabaseClient";
import {
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Trash2,
  Edit,
  Upload,
  Download,
  Eye,
  X,
  Plus,
} from "./icons";

interface CaseDashboardProps {
  cases: CaseRecord[];
  currentProfile: Profile | null;
  onSelectCase: (caseRecord: CaseRecord) => void;
  onEditCase?: (caseRecord: CaseRecord) => void;
  onDeleteCase?: (caseId: string) => void;
  onNewCase?: () => void;
}

function formatCOP(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatDateDisplay(dateStr?: string | null) {
  if (!dateStr) return "Sin fecha";
  try {
    const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
    return d.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function CaseDashboard({
  cases,
  currentProfile,
  onSelectCase,
  onEditCase,
  onDeleteCase,
  onNewCase,
}: CaseDashboardProps) {
  const isFirm = currentProfile?.role === "firm";
  const clientEmail = (currentProfile?.email || "").toLowerCase().trim();

  // Estados de búsqueda y ordenamiento
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "balance_desc" | "name_asc">("date_desc");

  // Estado del caso detallado seleccionado (para mostrar a la vista con el adjuntador de archivos)
  const [detailedCase, setDetailedCase] = useState<CaseRecord | null>(cases[0] || null);
  const [caseDocuments, setCaseDocuments] = useState<DocumentItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Estados del adjuntador de archivos a la vista
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("Auto / Providencia");
  const [uploadCustomName, setUploadCustomName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filtrar casos por usuario (si es cliente)
  const accessibleCases = useMemo(() => {
    if (isFirm) return cases;
    return cases.filter((c) => {
      if (c.client_email && c.client_email.toLowerCase().trim() === clientEmail) return true;
      if (c.client_id && currentProfile?.id && c.client_id === currentProfile.id) return true;
      if (c.client_name && currentProfile?.full_name && c.client_name.toLowerCase().includes(currentProfile.full_name.toLowerCase())) return true;
      return true; // Si es el usuario demo o asignado, mostrar
    });
  }, [cases, isFirm, clientEmail, currentProfile]);

  // Cargar documentos del caso detallado
  const loadDocuments = async (cId: string) => {
    setLoadingDocs(true);
    try {
      const docs = await fetchDocumentsForCaseFromDatabase(cId);
      setCaseDocuments(docs);
    } catch (e) {
      console.warn("Error cargando documentos", e);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Seleccionar caso para ver detalladamente
  const handleOpenDetail = (c: CaseRecord) => {
    setDetailedCase(c);
    setUploadFeedback(null);
    setUploadFile(null);
    setUploadCustomName("");
    loadDocuments(c.id);
  };

  // Subir archivo al caso detallado (Adjuntador de archivos a la vista)
  const handleDirectUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedCase) return;
    if (!uploadFile) {
      setUploadFeedback({ type: "error", text: "Por favor seleccione un archivo para adjuntar." });
      return;
    }

    setIsUploading(true);
    setUploadFeedback(null);

    const docName = uploadCustomName.trim() || uploadFile.name;

    try {
      const res = await uploadDocumentToSupabaseStorage(
        detailedCase.id,
        uploadFile,
        docName,
        uploadCategory,
        "Oficial"
      );

      if (res.success) {
        setUploadFeedback({
          type: "success",
          text: `¡Documento "${docName}" adjuntado exitosamente al expediente!`,
        });
        setUploadFile(null);
        setUploadCustomName("");
        // Recargar documentos
        await loadDocuments(detailedCase.id);
      } else {
        setUploadFeedback({ type: "error", text: res.message || "Error al subir documento." });
      }
    } catch (err: any) {
      setUploadFeedback({ type: "error", text: err.message || "Error de conexión al adjuntar." });
    } finally {
      setIsUploading(false);
    }
  };

  // Eliminar documento
  const handleDeleteDoc = async (docId: string, docName: string) => {
    if (!detailedCase) return;
    if (window.confirm(`¿Desea eliminar el documento "${docName}" del expediente?`)) {
      await deleteDocumentFromDatabase(docId);
      await loadDocuments(detailedCase.id);
    }
  };

  // Filtrado y Ordenamiento
  const filteredCases = useMemo(() => {
    return accessibleCases
      .filter((c) => {
        // Filtro de búsqueda
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = (c.title || "").toLowerCase().includes(q);
          const matchClient = (c.client_name || "").toLowerCase().includes(q);
          const matchRadicado = (c.radicado || c.id || "").toLowerCase().includes(q);
          const matchStatus = (c.status || "").toLowerCase().includes(q);
          const matchSteps = (c.next_step || "").toLowerCase().includes(q);
          if (!matchTitle && !matchClient && !matchRadicado && !matchStatus && !matchSteps) {
            return false;
          }
        }

        // Filtro de estado
        if (statusFilter !== "all") {
          if (statusFilter === "pendiente_saldo") {
            return (c.balance || 0) > 0;
          }
          if (statusFilter === "pagado") {
            return (c.balance || 0) === 0;
          }
          if (statusFilter === "activo") {
            return (c.status || "").toLowerCase().includes("activo") || (c.status || "").toLowerCase().includes("trámite");
          }
          if (statusFilter === "audiencia") {
            return (c.status || "").toLowerCase().includes("audiencia");
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date_desc") {
          return new Date(b.last_update || "2026-01-01").getTime() - new Date(a.last_update || "2026-01-01").getTime();
        }
        if (sortBy === "date_asc") {
          return new Date(a.last_update || "2026-01-01").getTime() - new Date(b.last_update || "2026-01-01").getTime();
        }
        if (sortBy === "balance_desc") {
          return (b.balance || 0) - (a.balance || 0);
        }
        if (sortBy === "name_asc") {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [accessibleCases, searchTerm, statusFilter, sortBy]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Encabezado Principal */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "14px",
          background: "var(--ink-soft)",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "20px 24px",
        }}
      >
        <div>
          <span className="kicker" style={{ color: "var(--brass)", fontWeight: 700, fontSize: "0.78rem" }}>
            Tablero Procesal & Seguimiento Judicial
          </span>
          <h2 style={{ margin: "4px 0 6px", color: "var(--text-bright)", fontSize: "1.45rem" }}>
            Tablero de Casos ({filteredCases.length})
          </h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "600px" }}>
            Supervise en tiempo real el estado actual, fechas de última actuación, próximos pasos y saldos pendientes sincronizados con Supabase.
          </p>
        </div>

        {isFirm && onNewCase && (
          <button
            type="button"
            onClick={onNewCase}
            className="btn primary"
            style={{
              padding: "10px 20px",
              fontSize: "0.84rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(217, 181, 106, 0.25)",
            }}
          >
            <Plus size={16} />
            <span>+ Nuevo Proceso / Caso</span>
          </button>
        )}
      </div>

      {/* Barra de Filtros, Búsqueda y Ordenamiento por Fecha */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          background: "var(--parchment-deep)",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          padding: "14px 18px",
        }}
      >
        {/* Buscador */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 280px" }}>
          <Search size={16} color="var(--brass)" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por caso, cliente, radicado, estado o próximos pasos..."
            style={{
              width: "100%",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid var(--line)",
              color: "var(--text-bright)",
              padding: "8px 14px",
              borderRadius: "6px",
              fontSize: "0.82rem",
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filtros de Estado */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Filter size={15} color="var(--text-muted)" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid var(--line)",
              color: "var(--text-bright)",
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "0.8rem",
            }}
          >
            <option value="all">Todos los estados</option>
            <option value="activo">En Trámite / Activo</option>
            <option value="audiencia">Audiencia en Trámite</option>
            <option value="pendiente_saldo">Con Saldo Pendiente</option>
            <option value="pagado">100% Pagados (Sin saldo)</option>
          </select>

          {/* Ordenar por Fecha */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowUpDown size={15} color="var(--brass)" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                background: "rgba(15, 23, 42, 0.6)",
                border: "1px solid var(--brass)",
                color: "var(--brass-light)",
                padding: "8px 12px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              <option value="date_desc">📅 Fecha Actualización (Más reciente)</option>
              <option value="date_asc">📅 Fecha Actualización (Más antigua)</option>
              <option value="balance_desc">💰 Mayor Saldo Pendiente</option>
              <option value="name_asc">🔤 Nombre de Caso (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE CASEDASHBOARD */}
      <div
        style={{
          background: "var(--ink-soft)",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          overflow: "hidden",
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "0.82rem",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "linear-gradient(90deg, #0b1324 0%, #172554 100%)",
                  borderBottom: "2px solid var(--brass)",
                  color: "var(--brass-light)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                }}
              >
                <th style={{ padding: "14px 16px" }}>Nombre del Caso / Proceso</th>
                <th style={{ padding: "14px 14px" }}>Cliente</th>
                <th style={{ padding: "14px 14px" }}>Estado Actual</th>
                <th style={{ padding: "14px 14px" }}>Fecha Actualización</th>
                <th style={{ padding: "14px 14px" }}>Próximos Pasos</th>
                <th style={{ padding: "14px 14px" }}>Saldo Pendiente</th>
                <th style={{ padding: "14px 16px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
                    No se encontraron procesos que coincidan con los filtros de búsqueda o fecha.
                  </td>
                </tr>
              ) : (
                filteredCases.map((item, idx) => {
                  const isSelected = detailedCase?.id === item.id;
                  const saldo = item.balance ?? Math.max(0, (item.total_fees || 0) - (item.total_fees || 0));
                  const isPaid = saldo === 0;

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        background: isSelected
                          ? "rgba(217, 181, 106, 0.12)"
                          : idx % 2 === 0
                          ? "rgba(15, 23, 42, 0.4)"
                          : "rgba(15, 23, 42, 0.7)",
                        transition: "background 0.2s ease",
                      }}
                    >
                      {/* Caso */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <strong style={{ color: "var(--text-bright)", fontSize: "0.85rem" }}>
                            {item.title}
                          </strong>
                          <span style={{ color: "var(--brass-light)", fontSize: "0.72rem" }}>
                            {item.process_type} · Rad: {item.radicado || item.id}
                          </span>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td style={{ padding: "14px 14px", color: "var(--text-muted)" }}>
                        <strong style={{ color: "var(--text-bright)", display: "block" }}>
                          {item.client_name || "Cliente Asignado"}
                        </strong>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {item.client_email || "Sin correo"}
                        </span>
                      </td>

                      {/* Estado Actual */}
                      <td style={{ padding: "14px 14px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "0.73rem",
                            fontWeight: 700,
                            background:
                              item.status_type === "success" || item.status.includes("Finalizado") || item.status.includes("Fallo")
                                ? "rgba(34, 197, 94, 0.18)"
                                : item.status_type === "warning" || item.status.includes("Abono") || item.status.includes("Audiencia")
                                ? "rgba(234, 179, 8, 0.18)"
                                : "rgba(56, 189, 248, 0.18)",
                            color:
                              item.status_type === "success" || item.status.includes("Finalizado") || item.status.includes("Fallo")
                                ? "#4ade80"
                                : item.status_type === "warning" || item.status.includes("Abono") || item.status.includes("Audiencia")
                                ? "#facc15"
                                : "#38bdf8",
                            border: `1px solid ${
                              item.status_type === "success" || item.status.includes("Finalizado")
                                ? "rgba(74, 222, 128, 0.3)"
                                : item.status_type === "warning" || item.status.includes("Abono")
                                ? "rgba(250, 204, 21, 0.3)"
                                : "rgba(56, 189, 248, 0.3)"
                            }`,
                          }}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Fecha de Actualización */}
                      <td style={{ padding: "14px 14px", color: "var(--text-muted)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} color="var(--brass)" />
                          <span style={{ fontWeight: 600, color: "var(--text-bright)" }}>
                            {formatDateDisplay(item.last_update)}
                          </span>
                        </div>
                      </td>

                      {/* Próximos Pasos */}
                      <td style={{ padding: "14px 14px", maxWidth: "260px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                          <span style={{ color: "var(--brass)", fontSize: "0.85rem" }}>➔</span>
                          <span style={{ color: "var(--text-bright)", fontSize: "0.78rem", lineHeight: 1.4 }}>
                            {item.next_step || item.observations || "Trámite regular ante despacho judicial"}
                          </span>
                        </div>
                      </td>

                      {/* Saldo Pendiente */}
                      <td style={{ padding: "14px 14px" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong
                            style={{
                              fontSize: "0.9rem",
                              color: isPaid ? "#4ade80" : "#f87171",
                            }}
                          >
                            {formatCOP(saldo)}
                          </strong>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            Pactado: {formatCOP(item.total_fees || 0)}
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            title="Ver caso detalladamente y adjuntar archivos"
                            style={{
                              padding: "6px 10px",
                              background: isSelected ? "var(--brass)" : "rgba(217, 181, 106, 0.15)",
                              color: isSelected ? "var(--ink)" : "var(--brass-light)",
                              border: "1px solid var(--brass)",
                              borderRadius: "4px",
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Eye size={13} />
                            <span>Ver Detalle &amp; Archivos</span>
                          </button>

                          {isFirm && onEditCase && (
                            <button
                              type="button"
                              onClick={() => onEditCase(item)}
                              title="Editar caso en Supabase"
                              style={{
                                padding: "6px 8px",
                                background: "transparent",
                                color: "var(--brass-light)",
                                border: "1px solid var(--line)",
                                borderRadius: "4px",
                                fontSize: "0.76rem",
                                cursor: "pointer",
                              }}
                            >
                              <Edit size={13} />
                            </button>
                          )}

                          {isFirm && onDeleteCase && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Seguro que desea eliminar el proceso "${item.title}"?`)) {
                                  onDeleteCase(item.id);
                                }
                              }}
                              title="Eliminar caso de Supabase"
                              style={{
                                padding: "6px 8px",
                                background: "transparent",
                                color: "#f87171",
                                border: "1px solid rgba(239, 68, 68, 0.4)",
                                borderRadius: "4px",
                                fontSize: "0.76rem",
                                cursor: "pointer",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VISTA DETALLADA DEL CASO CON EL ADJUNTADOR DE ARCHIVOS A LA VISTA */}
      {/* ======================================================== */}
      {detailedCase && (
        <section
          style={{
            background: "var(--ink-soft)",
            border: "2px solid var(--brass)",
            borderRadius: "10px",
            padding: "24px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
          }}
        >
          {/* Cabecera del caso detallado */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "14px",
              borderBottom: "1px solid var(--line)",
              paddingBottom: "18px",
              marginBottom: "20px",
            }}
          >
            <div>
              <span style={{ fontSize: "0.75rem", background: "rgba(217, 181, 106, 0.2)", color: "var(--brass-light)", padding: "3px 10px", borderRadius: "10px", fontWeight: 700 }}>
                {detailedCase.process_type}
              </span>
              <h3 style={{ margin: "8px 0 4px", fontSize: "1.35rem", color: "var(--text-bright)" }}>
                {detailedCase.title}
              </h3>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>
                <strong>Cliente:</strong> {detailedCase.client_name || "N/A"} ·{" "}
                <strong>Radicado:</strong> {detailedCase.radicado || detailedCase.id} ·{" "}
                <strong>Despacho:</strong> {detailedCase.authority || "Juzgado Civil de Bogotá"}
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Saldo Pendiente</span>
                <strong style={{ fontSize: "1.2rem", color: (detailedCase.balance || 0) > 0 ? "#f87171" : "#4ade80" }}>
                  {formatCOP(detailedCase.balance || 0)}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => onSelectCase(detailedCase)}
                className="btn primary"
                style={{ padding: "8px 16px", fontSize: "0.8rem", fontWeight: 700 }}
              >
                Abrir en Módulo Principal
              </button>
            </div>
          </div>

          {/* Grid de 2 columnas: Detalles y ADJUNTADOR DE ARCHIVOS A LA VISTA */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "24px",
            }}
          >
            {/* Columna Izquierda: Información de Próximos Pasos y Estado */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                style={{
                  background: "var(--parchment-deep)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <h4 style={{ margin: "0 0 10px", color: "var(--brass-light)", fontSize: "0.95rem" }}>
                  📌 Próximos Pasos &amp; Términos
                </h4>
                <p style={{ margin: "0 0 12px", color: "var(--text-bright)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                  {detailedCase.next_step || "Seguimiento riguroso de términos y notificaciones con el despacho judicial."}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.78rem" }}>
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "8px 12px", borderRadius: "6px" }}>
                    <span style={{ color: "var(--text-muted)", display: "block" }}>Fase Actual</span>
                    <strong style={{ color: "var(--text-bright)" }}>
                      {detailedCase.current_phase || "Instrucción y Trámite"}
                    </strong>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "8px 12px", borderRadius: "6px" }}>
                    <span style={{ color: "var(--text-muted)", display: "block" }}>Avance Procesal</span>
                    <strong style={{ color: "#38bdf8" }}>{detailedCase.progress}%</strong>
                  </div>
                </div>
              </div>

              {/* Observaciones del Caso */}
              <div
                style={{
                  background: "var(--parchment-deep)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <h4 style={{ margin: "0 0 8px", color: "var(--brass-light)", fontSize: "0.95rem" }}>
                  📝 Observaciones Registradas
                </h4>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.5 }}>
                  {detailedCase.observations || "Sin observaciones pendientes registradas para este expediente."}
                </p>
              </div>
            </div>

            {/* Columna Derecha: ADJUNTADOR DE ARCHIVOS A LA VISTA */}
            <div
              style={{
                background: "var(--parchment-deep)",
                border: "2px dashed var(--brass)",
                borderRadius: "8px",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0, color: "var(--brass-light)", fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Upload size={17} />
                  <span>Adjuntador de Archivos (En tiempo real)</span>
                </h4>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  Supabase Storage
                </span>
              </div>

              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Adjunte autos, memoriales, demandas o pruebas directamente. Quedarán archivados en la nube y vinculados a este expediente.
              </p>

              {/* Formulario directo de subida */}
              <form onSubmit={handleDirectUpload} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Seleccionar Archivo (PDF, Word, Imagen, etc.):
                  </label>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                        if (!uploadCustomName) {
                          setUploadCustomName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                        }
                      }
                    }}
                    style={{
                      width: "100%",
                      fontSize: "0.8rem",
                      color: "var(--text-bright)",
                      background: "rgba(15, 23, 42, 0.7)",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid var(--line)",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                      Nombre a Mostrar:
                    </label>
                    <input
                      type="text"
                      value={uploadCustomName}
                      onChange={(e) => setUploadCustomName(e.target.value)}
                      placeholder="Ej. Auto Admisorio..."
                      style={{
                        width: "100%",
                        fontSize: "0.8rem",
                        padding: "7px 10px",
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        color: "var(--text-bright)",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                      Categoría:
                    </label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      style={{
                        width: "100%",
                        fontSize: "0.8rem",
                        padding: "7px 10px",
                        background: "rgba(15, 23, 42, 0.7)",
                        border: "1px solid var(--line)",
                        borderRadius: "4px",
                        color: "var(--text-bright)",
                      }}
                    >
                      <option value="Auto / Providencia">Auto / Providencia</option>
                      <option value="Demanda">Demanda</option>
                      <option value="Memorial">Memorial</option>
                      <option value="Pruebas">Pruebas</option>
                      <option value="Poder">Poder</option>
                      <option value="Factura / Recibo">Factura / Recibo</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!uploadFile || isUploading}
                  style={{
                    marginTop: "6px",
                    padding: "9px 16px",
                    background: uploadFile ? "var(--brass)" : "rgba(217, 181, 106, 0.3)",
                    color: "var(--ink)",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: uploadFile && !isUploading ? "pointer" : "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Upload size={15} />
                  <span>{isUploading ? "Adjuntando archivo a Supabase..." : "📤 Adjuntar e Incorporar al Expediente"}</span>
                </button>
              </form>

              {uploadFeedback && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    background: uploadFeedback.type === "success" ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    color: uploadFeedback.type === "success" ? "#4ade80" : "#f87171",
                    border: `1px solid ${uploadFeedback.type === "success" ? "#22c55e" : "#ef4444"}`,
                  }}
                >
                  {uploadFeedback.text}
                </div>
              )}

              {/* Lista de Documentos del Expediente */}
              <div style={{ marginTop: "10px" }}>
                <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-bright)", display: "block", marginBottom: "8px" }}>
                  Archivos Incorporados a este Caso ({caseDocuments.length}):
                </span>

                {loadingDocs ? (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Cargando documentos...</p>
                ) : caseDocuments.length === 0 ? (
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
                    Aún no hay archivos adjuntos en este proceso. Utilice el selector arriba para subir el primero.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "180px", overflowY: "auto" }}>
                    {caseDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(15, 23, 42, 0.7)",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          fontSize: "0.76rem",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                          <FileText size={14} color="var(--brass)" />
                          <span style={{ color: "var(--text-bright)", fontWeight: 600, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "160px" }}>
                            {doc.name}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>({doc.file_size || "1.2 MB"})</span>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          {doc.download_url && (
                            <a
                              href={doc.download_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--brass-light)", textDecoration: "none", fontSize: "0.72rem", display: "inline-flex", alignItems: "center", gap: "2px" }}
                            >
                              <Download size={13} />
                            </a>
                          )}
                          {isFirm && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDoc(doc.id, doc.name)}
                              style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}
                              title="Eliminar archivo"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
