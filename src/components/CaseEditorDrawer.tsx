import React, { useState } from "react";
import { CaseRecord, AgendaItem, HistoryItem, DocumentItem, Profile } from "../types/portal";
import { caseTemplates } from "../data/initialData";
import {
  X,
  Sliders,
  Calendar,
  Clock,
  FileText,
  User,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Scale,
  Eye,
} from "./icons";

interface CaseEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  caseRecord: CaseRecord;
  onUpdateCase: (updated: CaseRecord) => void;
  agenda: AgendaItem[];
  onUpdateAgenda: (updated: AgendaItem[]) => void;
  history: HistoryItem[];
  onUpdateHistory: (updated: HistoryItem[]) => void;
  documents: DocumentItem[];
  onUpdateDocuments: (updated: DocumentItem[]) => void;
  profile: Profile;
  onUpdateProfile: (updated: Profile) => void;
  onResetDefaults: () => void;
  onLoadTemplate: (templateId: string) => void;
  onEnterPresentationMode: () => void;
}

export function CaseEditorDrawer({
  isOpen,
  onClose,
  caseRecord,
  onUpdateCase,
  agenda,
  onUpdateAgenda,
  history,
  onUpdateHistory,
  documents,
  onUpdateDocuments,
  profile,
  onUpdateProfile,
  onResetDefaults,
  onLoadTemplate,
  onEnterPresentationMode,
}: CaseEditorDrawerProps) {
  const [activeTab, setActiveTab] = useState<"general" | "agenda" | "historial" | "documentos" | "cliente">("general");

  // New Agenda Item Form state
  const [newAgendaDate, setNewAgendaDate] = useState("2026-10-30");
  const [newAgendaTime, setNewAgendaTime] = useState("10:00 AM");
  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaDetail, setNewAgendaDetail] = useState("");
  const [newAgendaType, setNewAgendaType] = useState<AgendaItem["type"]>("Audiencia Judicial");
  const [showAddAgenda, setShowAddAgenda] = useState(false);

  // New History Item Form state
  const [newHistoryDate, setNewHistoryDate] = useState(new Date().toISOString().split("T")[0]);
  const [newHistoryTitle, setNewHistoryTitle] = useState("");
  const [newHistoryDetail, setNewHistoryDetail] = useState("");
  const [newHistoryNote, setNewHistoryNote] = useState("");
  const [showAddHistory, setShowAddHistory] = useState(false);

  // New Document Form state
  const [newDocName, setNewDocName] = useState("");
  const [newDocCategory, setNewDocCategory] = useState<DocumentItem["category"]>("Auto / Providencia");
  const [showAddDoc, setShowAddDoc] = useState(false);

  const handleCaseChange = (field: keyof CaseRecord, value: any) => {
    onUpdateCase({
      ...caseRecord,
      [field]: value,
      last_update: new Date().toISOString().split("T")[0],
    });
  };

  const statusPresets = [
    "Demanda Radicada",
    "Auto Admisorio Notificado",
    "Período Probatorio Abierto",
    "Audiencia de Juzgamiento Programada",
    "Término para Alegatos de Conclusión",
    "En Despacho para Sentencia",
    "Sentencia Favorable en Primera Instancia",
    "En Trámite de Cumplimiento",
  ];

  const handleAddAgendaItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendaTitle.trim()) return;
    const newItem: AgendaItem = {
      id: "ag_" + Date.now(),
      case_id: caseRecord.id,
      event_date: newAgendaDate,
      event_time: newAgendaTime,
      title: newAgendaTitle.trim(),
      detail: newAgendaDetail.trim() || null,
      type: newAgendaType,
    };
    onUpdateAgenda([...agenda, newItem].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
    setNewAgendaTitle("");
    setNewAgendaDetail("");
    setShowAddAgenda(false);
  };

  const handleDeleteAgendaItem = (id: string) => {
    onUpdateAgenda(agenda.filter((item) => item.id !== id));
  };

  const handleAddHistoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHistoryTitle.trim()) return;
    const newItem: HistoryItem = {
      id: "hist_" + Date.now(),
      case_id: caseRecord.id,
      event_date: newHistoryDate,
      title: newHistoryTitle.trim(),
      detail: newHistoryDetail.trim() || null,
      note: newHistoryNote.trim() || null,
      is_milestone: true,
    };
    onUpdateHistory([newItem, ...history].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()));
    setNewHistoryTitle("");
    setNewHistoryDetail("");
    setNewHistoryNote("");
    setShowAddHistory(false);
  };

  const handleDeleteHistoryItem = (id: string) => {
    onUpdateHistory(history.filter((item) => item.id !== id));
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    const cleanName = newDocName.trim().endsWith(".pdf") ? newDocName.trim() : `${newDocName.trim()}.pdf`;
    const newItem: DocumentItem = {
      id: "doc_" + Date.now(),
      case_id: caseRecord.id,
      name: cleanName,
      category: newDocCategory,
      file_size: `${(Math.random() * 2 + 0.8).toFixed(1)} MB`,
      uploaded_at: new Date().toISOString().split("T")[0],
      status: "Oficial",
    };
    const nextDocs = [newItem, ...documents];
    onUpdateDocuments(nextDocs);
    handleCaseChange("documents_count", nextDocs.length);
    setNewDocName("");
    setShowAddDoc(false);
  };

  const handleDeleteDocument = (id: string) => {
    const nextDocs = documents.filter((doc) => doc.id !== id);
    onUpdateDocuments(nextDocs);
    handleCaseChange("documents_count", nextDocs.length);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        right: 0,
        zIndex: 100,
        width: "100%",
        maxWidth: "620px",
        backgroundColor: "var(--ink-soft)",
        borderLeft: "2px solid var(--brass)",
        boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.65)",
        display: "flex",
        flexDirection: "column",
        color: "var(--text-bright)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Top Banner / Header */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--line)",
          background: "var(--ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "4px",
              background: "rgba(217, 181, 106, 0.15)",
              border: "1px solid var(--brass)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--brass-light)",
            }}
          >
            <Sliders size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.1rem",
                  fontFamily: "var(--font-serif)",
                  color: "var(--text-bright)",
                }}
              >
                Simulador del Caso &amp; Avance
              </h2>
              <span
                style={{
                  fontSize: "0.68rem",
                  background: "rgba(217, 181, 106, 0.2)",
                  color: "var(--brass-light)",
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: "2px",
                  border: "1px solid var(--brass)",
                  textTransform: "uppercase",
                }}
              >
                En vivo
              </span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Modifique los datos en tiempo real para mostrar al cliente
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            onClick={onEnterPresentationMode}
            title="Presentar al cliente (pantalla limpia)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "var(--brass-light)",
              background: "var(--ink-panel)",
              border: "1px solid var(--line)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            <Eye size={14} />
            <span>Presentar</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--text-muted)",
              padding: "6px 10px",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            aria-label="Cerrar editor"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Quick Template Switcher */}
      <div
        style={{
          padding: "10px 20px",
          background: "var(--parchment-deep)",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          overflowX: "auto",
          fontSize: "0.75rem",
        }}
      >
        <span
          style={{
            color: "var(--brass-light)",
            fontWeight: 600,
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Sparkles size={14} />
          Plantillas:
        </span>
        {caseTemplates.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onLoadTemplate(tpl.id)}
            style={{
              padding: "4px 10px",
              borderRadius: "3px",
              background: "var(--ink-panel)",
              border: "1px solid var(--line)",
              color: "var(--text)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontSize: "0.75rem",
            }}
          >
            {tpl.name}
          </button>
        ))}
      </div>

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--line)",
          background: "var(--ink)",
          padding: "0 16px",
          gap: "8px",
          overflowX: "auto",
        }}
      >
        {[
          { id: "general", label: "Caso & Avance", icon: Scale },
          { id: "agenda", label: `Agenda (${agenda.length})`, icon: Calendar },
          { id: "historial", label: `Actuaciones (${history.length})`, icon: Clock },
          { id: "documentos", label: `Expediente (${documents.length})`, icon: FileText },
          { id: "cliente", label: "Cliente", icon: User },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: "12px 14px",
                fontSize: "0.82rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--brass-light)" : "var(--text-muted)",
                borderBottom: isActive ? "2px solid var(--brass)" : "2px solid transparent",
                background: "transparent",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Content Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* ===================== TAB: GENERAL & PROGRESO ===================== */}
        {activeTab === "general" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Live Progress Control */}
            <div
              style={{
                padding: "18px 20px",
                borderRadius: "4px",
                background: "var(--ink-panel)",
                border: "1px solid var(--brass)",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <label
                    style={{
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--brass)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Sparkles size={14} />
                    Porcentaje de Avance del Caso
                  </label>
                  <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Mueva el control para actualizar el anillo de progreso circular en vivo
                  </p>
                </div>
                <div
                  style={{
                    fontSize: "1.7rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-serif)",
                    color: "var(--brass-light)",
                  }}
                >
                  {caseRecord.progress}%
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={caseRecord.progress}
                onChange={(e) => handleCaseChange("progress", parseInt(e.target.value, 10))}
                style={{
                  width: "100%",
                  accentColor: "var(--brass)",
                  cursor: "pointer",
                }}
              />

              {/* Jump Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleCaseChange("progress", pct)}
                    style={{
                      padding: "8px",
                      fontSize: "0.75rem",
                      borderRadius: "3px",
                      border: "1px solid var(--line)",
                      background: caseRecord.progress === pct ? "var(--brass)" : "var(--parchment-deep)",
                      color: caseRecord.progress === pct ? "var(--ink)" : "var(--text-bright)",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Fijar {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Title & Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                Título del Caso
                <input
                  type="text"
                  value={caseRecord.title}
                  onChange={(e) => handleCaseChange("title", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    background: "var(--parchment-deep)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    color: "var(--text-bright)",
                    fontSize: "0.9rem",
                  }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  Radicado Judicial
                  <input
                    type="text"
                    value={caseRecord.filed_date || ""}
                    onChange={(e) => handleCaseChange("filed_date", e.target.value)}
                    style={{
                      padding: "10px 12px",
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "4px",
                      color: "var(--text-bright)",
                      fontFamily: "monospace",
                      fontSize: "0.85rem",
                    }}
                  />
                </label>

                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  Autoridad Judicial / Juzgado
                  <input
                    type="text"
                    value={caseRecord.authority || ""}
                    onChange={(e) => handleCaseChange("authority", e.target.value)}
                    style={{
                      padding: "10px 12px",
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "4px",
                      color: "var(--text-bright)",
                      fontSize: "0.85rem",
                    }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  Abogado Encargado
                  <input
                    type="text"
                    value={caseRecord.lawyer || ""}
                    onChange={(e) => handleCaseChange("lawyer", e.target.value)}
                    style={{
                      padding: "10px 12px",
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "4px",
                      color: "var(--text-bright)",
                      fontSize: "0.85rem",
                    }}
                  />
                </label>

                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                  Saldo Pendiente de Honorarios ($ COP)
                  <input
                    type="number"
                    value={caseRecord.balance}
                    onChange={(e) => handleCaseChange("balance", parseFloat(e.target.value) || 0)}
                    style={{
                      padding: "10px 12px",
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "4px",
                      color: "var(--sage)",
                      fontWeight: 600,
                      fontFamily: "monospace",
                      fontSize: "0.9rem",
                    }}
                  />
                </label>
              </div>

              {/* Status & Presets */}
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
                Estado Procesal
                <input
                  type="text"
                  value={caseRecord.status}
                  onChange={(e) => handleCaseChange("status", e.target.value)}
                  style={{
                    padding: "10px 12px",
                    background: "var(--parchment-deep)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    color: "var(--brass-light)",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                  }}
                />
              </label>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {statusPresets.slice(0, 4).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleCaseChange("status", preset)}
                    style={{
                      fontSize: "0.72rem",
                      padding: "4px 8px",
                      borderRadius: "3px",
                      background: "var(--ink-panel)",
                      border: "1px solid var(--line)",
                      color: "var(--text)",
                      cursor: "pointer",
                    }}
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: AGENDA ===================== */}
        {activeTab === "agenda" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Audiencias y Citas</h3>
              <button
                type="button"
                onClick={() => setShowAddAgenda(!showAddAgenda)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  background: "var(--brass)",
                  color: "var(--ink)",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {showAddAgenda ? "Cancelar" : "+ Nuevo Evento"}
              </button>
            </div>

            {showAddAgenda && (
              <form
                onSubmit={handleAddAgendaItem}
                style={{
                  padding: "16px",
                  background: "var(--ink-panel)",
                  border: "1px solid var(--brass)",
                  borderRadius: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <input
                    type="date"
                    value={newAgendaDate}
                    onChange={(e) => setNewAgendaDate(e.target.value)}
                    style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
                    required
                  />
                  <input
                    type="text"
                    value={newAgendaTime}
                    onChange={(e) => setNewAgendaTime(e.target.value)}
                    placeholder="Hora (ej. 09:30 AM)"
                    style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
                  />
                </div>
                <input
                  type="text"
                  value={newAgendaTitle}
                  onChange={(e) => setNewAgendaTitle(e.target.value)}
                  placeholder="Título del evento o audiencia"
                  style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
                  required
                />
                <textarea
                  rows={2}
                  value={newAgendaDetail}
                  onChange={(e) => setNewAgendaDetail(e.target.value)}
                  placeholder="Detalles para el cliente (despacho, enlace virtual...)"
                  style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "9px",
                    background: "var(--brass)",
                    color: "var(--ink)",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Guardar en Agenda
                </button>
              </form>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {agenda.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 14px",
                    background: "var(--ink-panel)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--brass)", fontFamily: "monospace" }}>
                      {item.event_date} {item.event_time ? `· ${item.event_time}` : ""}
                    </span>
                    <h4 style={{ margin: "2px 0 4px", fontSize: "0.9rem" }}>{item.title}</h4>
                    {item.detail && <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.detail}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAgendaItem(item.id)}
                    style={{ background: "transparent", border: "none", color: "#e08a8a", cursor: "pointer" }}
                    title="Eliminar evento"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB: HISTORIAL ===================== */}
        {activeTab === "historial" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Actuaciones Judiciales</h3>
              <button
                type="button"
                onClick={() => setShowAddHistory(!showAddHistory)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  background: "var(--brass)",
                  color: "var(--ink)",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {showAddHistory ? "Cancelar" : "+ Nueva Actuación"}
              </button>
            </div>

            {showAddHistory && (
              <form
                onSubmit={handleAddHistoryItem}
                style={{
                  padding: "16px",
                  background: "var(--ink-panel)",
                  border: "1px solid var(--brass)",
                  borderRadius: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <input
                  type="date"
                  value={newHistoryDate}
                  onChange={(e) => setNewHistoryDate(e.target.value)}
                  style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
                  required
                />
                <input
                  type="text"
                  value={newHistoryTitle}
                  onChange={(e) => setNewHistoryTitle(e.target.value)}
                  placeholder="Título de la actuación (ej. Auto admite demanda)"
                  style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
                  required
                />
                <textarea
                  rows={2}
                  value={newHistoryDetail}
                  onChange={(e) => setNewHistoryDetail(e.target.value)}
                  placeholder="Resumen jurídico formal..."
                  style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
                />
                <textarea
                  rows={2}
                  value={newHistoryNote}
                  onChange={(e) => setNewHistoryNote(e.target.value)}
                  placeholder="Nota explicativa para el cliente (lenguaje claro y tranquilizador)..."
                  style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--brass-deep)", color: "var(--brass-light)" }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "9px",
                    background: "var(--brass)",
                    color: "var(--ink)",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Agregar al Historial
                </button>
              </form>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 14px",
                    background: "var(--ink-panel)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{item.event_date}</span>
                    <h4 style={{ margin: "2px 0 4px", fontSize: "0.9rem" }}>{item.title}</h4>
                    {item.detail && <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text)" }}>{item.detail}</p>}
                    {item.note && (
                      <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "var(--sage)", fontStyle: "italic" }}>
                        Nota cliente: &quot;{item.note}&quot;
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistoryItem(item.id)}
                    style={{ background: "transparent", border: "none", color: "#e08a8a", cursor: "pointer" }}
                    title="Eliminar actuación"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB: DOCUMENTOS ===================== */}
        {activeTab === "documentos" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>Expediente Digital ({documents.length})</h3>
              <button
                type="button"
                onClick={() => setShowAddDoc(!showAddDoc)}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  background: "var(--brass)",
                  color: "var(--ink)",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {showAddDoc ? "Cancelar" : "+ Adjuntar Documento"}
              </button>
            </div>

            {showAddDoc && (
              <form
                onSubmit={handleAddDocument}
                style={{
                  padding: "16px",
                  background: "var(--ink-panel)",
                  border: "1px solid var(--brass)",
                  borderRadius: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Nombre de archivo (ej. Auto_Admisorio.pdf)"
                  style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
                  required
                />
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value as any)}
                  style={{ padding: "8px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
                >
                  <option value="Demanda">Demanda</option>
                  <option value="Auto / Providencia">Auto / Providencia Judicial</option>
                  <option value="Memorial">Memorial</option>
                  <option value="Poder">Poder</option>
                  <option value="Pruebas">Pruebas</option>
                  <option value="Facturación">Facturación</option>
                </select>
                <button
                  type="submit"
                  style={{
                    padding: "9px",
                    background: "var(--brass)",
                    color: "var(--ink)",
                    fontWeight: 600,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Guardar Documento
                </button>
              </form>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: "10px 14px",
                    background: "var(--ink-panel)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 500, color: "var(--text-bright)" }}>{doc.name}</p>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {doc.category} · {doc.file_size} · {doc.uploaded_at}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc.id)}
                    style={{ background: "transparent", border: "none", color: "#e08a8a", cursor: "pointer" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== TAB: CLIENTE ===================== */}
        {activeTab === "cliente" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Datos del Cliente en el Portal</h3>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
              Nombre Completo
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => {
                  const name = e.target.value;
                  const parts = name.trim().split(" ");
                  const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
                  onUpdateProfile({ ...profile, full_name: name, initials });
                }}
                style={{ padding: "10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)" }}
              />
            </label>

            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "6px" }}>
              Iniciales del Avatar
              <input
                type="text"
                maxLength={3}
                value={profile.initials}
                onChange={(e) => onUpdateProfile({ ...profile, initials: e.target.value.toUpperCase() })}
                style={{ padding: "10px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--brass-light)", fontFamily: "monospace", fontWeight: 700 }}
              />
            </label>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 24px",
          borderTop: "1px solid var(--line)",
          background: "var(--ink)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={onResetDefaults}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            fontSize: "0.78rem",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={14} />
          <span>Restablecer todo</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "9px 20px",
            fontSize: "0.85rem",
            fontWeight: 600,
            background: "var(--brass)",
            color: "var(--ink)",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Guardar &amp; Ver Portal
        </button>
      </div>
    </div>
  );
}
