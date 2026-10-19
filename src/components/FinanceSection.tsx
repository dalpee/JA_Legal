import React, { useState, useMemo } from "react";
import { FinancialRecord, Profile, CaseRecord } from "../types/portal";
import { FinancialCharts } from "./FinancialCharts";
import { syncFinancialRecordToDatabase, deleteFinancialRecordFromDatabase } from "../lib/supabaseClient";
import {
  FileText,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Download,
  X,
  Scale,
} from "./icons";

interface FinanceSectionProps {
  finances: FinancialRecord[];
  onAddTransaction: (record: FinancialRecord) => void;
  onDeleteTransaction: (id: string) => void;
  userProfile: Profile | null;
  caseRecord: CaseRecord | null;
  onUpdateTransaction?: (record: FinancialRecord) => void;
}

function formatCOP(val?: number | null) {
  const num = val ?? 0;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateDisplay(dateStr?: string | null) {
  if (!dateStr || dateStr.trim() === "") return "—";
  try {
    if (dateStr.includes("/")) {
      return dateStr;
    }
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

export function FinanceSection({
  finances,
  onAddTransaction,
  onDeleteTransaction,
  userProfile,
  caseRecord,
  onUpdateTransaction,
}: FinanceSectionProps) {
  const isFirm = userProfile?.role === "firm";
  const [activeTab, setActiveTab] = useState<"tabla" | "graficas" | "contabilidad">("tabla");
  const [accountingModalOpen, setAccountingModalOpen] = useState(false);
  const [editingAccountingRecord, setEditingAccountingRecord] = useState<FinancialRecord | null>(null);
  const [accountingType, setAccountingType] = useState<"ingreso" | "egreso">("egreso");
  const [accountingCategory, setAccountingCategory] = useState("Operativo Despacho");
  const [accountingBeneficiary, setAccountingBeneficiary] = useState("");
  const [accountingReason, setAccountingReason] = useState("");
  const [accountingAmount, setAccountingAmount] = useState(0);
  const [accountingDate, setAccountingDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountingMethod, setAccountingMethod] = useState("Transferencia Bancaria");
  const [accountingNotes, setAccountingNotes] = useState("");
  const [accountingSearch, setAccountingSearch] = useState("");
  const [accountingTypeFilter, setAccountingTypeFilter] = useState<"all" | "ingreso" | "egreso">("all");

  // Filtros y Búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "balance_desc" | "pactado_desc">("date_desc");

  // Modal para Crear o Editar Registro Financiero (Modelo Excel)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinancialRecord | null>(null);

  // Campos del formulario modal
  const [caseName, setCaseName] = useState("");
  const [clientName, setClientName] = useState("");
  const [totalPactado, setTotalPactado] = useState<number>(1000000);
  const [formaCobro, setFormaCobro] = useState("Transferencia");
  const [abonoRecibido, setAbonoRecibido] = useState<number>(1000000);
  const [pctMarlon, setPctMarlon] = useState<number>(60);
  const [fechaUltimoAbono, setFechaUltimoAbono] = useState(new Date().toISOString().split("T")[0]);
  const [observaciones, setObservaciones] = useState("");

  // Cálculos automáticos en el modal
  const pctSebastian = Math.max(0, 100 - pctMarlon);
  const saldoPendiente = Math.max(0, totalPactado - abonoRecibido);
  const marlonRecibe = Math.round((abonoRecibido * pctMarlon) / 100);
  const sebastianRecibe = Math.round((abonoRecibido * pctSebastian) / 100);

  const calculatedStatus: "Pagado" | "Abono parcial" | "Pendiente" =
    abonoRecibido >= totalPactado && totalPactado > 0
      ? "Pagado"
      : abonoRecibido > 0
      ? "Abono parcial"
      : "Pendiente";

  // Abrir modal de creación
  const handleOpenCreateModal = () => {
    setEditingRecord(null);
    setCaseName(caseRecord ? caseRecord.title : "");
    setClientName(caseRecord?.client_name || "");
    setTotalPactado(1000000);
    setFormaCobro("Transferencia");
    setAbonoRecibido(1000000);
    setPctMarlon(60);
    setFechaUltimoAbono(new Date().toISOString().split("T")[0]);
    setObservaciones("");
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEditModal = (rec: FinancialRecord) => {
    setEditingRecord(rec);
    setCaseName(rec.case_name || rec.concept || "");
    setClientName(rec.client_name || "");
    setTotalPactado(rec.total_pactado ?? rec.amount ?? 0);
    setFormaCobro(rec.forma_cobro || rec.payment_method || "Transferencia");
    setAbonoRecibido(rec.abono_recibido ?? (rec.status === "completado" ? rec.amount : 0));
    setPctMarlon(rec.pct_marlon ?? 60);
    setFechaUltimoAbono(rec.fecha_ultimo_abono || rec.date || "");
    setObservaciones(rec.notes || "");
    setIsModalOpen(true);
  };

  // Guardar (Crear o Actualizar) en Supabase y localmente
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseName.trim() || !clientName.trim()) {
      alert("Por favor ingrese el nombre del caso y del cliente.");
      return;
    }

    const recordToSave: FinancialRecord = {
      id: editingRecord ? editingRecord.id : "fin_" + Date.now(),
      case_id: editingRecord?.case_id || caseRecord?.id || "case_custom_" + Date.now(),
      case_name: caseName.trim(),
      client_name: clientName.trim(),
      type: "ingreso",
      category: "Honorarios",
      concept: caseName.trim(),
      amount: abonoRecibido,
      total_pactado: totalPactado,
      abono_recibido: abonoRecibido,
      saldo_pendiente: saldoPendiente,
      forma_cobro: formaCobro,
      pct_marlon: pctMarlon,
      pct_sebastian: pctSebastian,
      marlon_recibe: marlonRecibe,
      sebastian_recibe: sebastianRecibe,
      payment_status: calculatedStatus,
      fecha_ultimo_abono: fechaUltimoAbono,
      date: fechaUltimoAbono || new Date().toISOString().split("T")[0],
      status: calculatedStatus === "Pagado" ? "completado" : "pendiente",
      payment_method: formaCobro as any,
      receipt_number: editingRecord?.receipt_number || `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      notes: observaciones.trim(),
    };

    // Sincronizar en Supabase
    await syncFinancialRecordToDatabase(recordToSave);

    if (editingRecord) {
      if (onUpdateTransaction) {
        onUpdateTransaction(recordToSave);
      } else {
        onDeleteTransaction(editingRecord.id);
        onAddTransaction(recordToSave);
      }
    } else {
      onAddTransaction(recordToSave);
    }

    setIsModalOpen(false);
  };

  // Eliminar registro
  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Desea eliminar el registro financiero de "${name}" de Supabase?`)) {
      await deleteFinancialRecordFromDatabase(id);
      onDeleteTransaction(id);
    }
  };

  const generalMovements = finances.filter((item) => !item.case_id);
  const accountingVisibleMovements = generalMovements.filter((item) => {
    if (accountingTypeFilter !== "all" && item.type !== accountingTypeFilter) return false;
    const q = accountingSearch.trim().toLowerCase();
    return !q || [item.category, item.client_name, item.concept, item.payment_method, item.notes]
      .some((value) => String(value || "").toLowerCase().includes(q));
  }).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const accountingIncome = generalMovements.filter((item) => item.type === "ingreso").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const accountingExpenses = generalMovements.filter((item) => item.type === "egreso").reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const openAccountingModal = (record?: FinancialRecord) => {
    setEditingAccountingRecord(record || null);
    setAccountingType(record?.type || "egreso");
    setAccountingCategory(record?.category || "Operativo Despacho");
    setAccountingBeneficiary(record?.client_name || "");
    setAccountingReason(record?.concept || "");
    setAccountingAmount(record?.amount || 0);
    setAccountingDate(record?.date || new Date().toISOString().slice(0, 10));
    setAccountingMethod(record?.payment_method || "Transferencia Bancaria");
    setAccountingNotes(record?.notes || "");
    setAccountingModalOpen(true);
  };

  const handleSaveAccountingMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountingBeneficiary.trim() || !accountingReason.trim() || accountingAmount <= 0) return;
    const record: FinancialRecord = {
      id: editingAccountingRecord?.id || `accounting_${Date.now()}`,
      client_name: accountingBeneficiary.trim(),
      type: accountingType,
      category: accountingCategory,
      concept: accountingReason.trim(),
      amount: Number(accountingAmount),
      date: accountingDate,
      status: "completado",
      payment_method: accountingMethod as FinancialRecord["payment_method"],
      receipt_number: editingAccountingRecord?.receipt_number || `MOV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      notes: accountingNotes.trim(),
    };
    await syncFinancialRecordToDatabase(record);
    if (editingAccountingRecord && onUpdateTransaction) onUpdateTransaction(record);
    else if (editingAccountingRecord) {
      onDeleteTransaction(editingAccountingRecord.id);
      onAddTransaction(record);
    } else onAddTransaction(record);
    setAccountingModalOpen(false);
  };

  // Exportar a Excel (CSV con BOM)
  const handleExportExcel = () => {
    const headers = [
      "Nombre del caso",
      "Cliente",
      "Valor total pactado",
      "Forma de cobro",
      "Abono recibido",
      "Saldo pendiente",
      ...(isFirm ? ["% Marlon", "% Sebastián", "Marlon recibe", "Sebastián recibe"] : []),
      "Estado de pago",
      "Fecha último abono",
      "Observaciones",
    ];

    const rows = filteredFinances.map((f) => [
      `"${(f.case_name || f.concept || "").replace(/"/g, '""')}"`,
      `"${(f.client_name || "").replace(/"/g, '""')}"`,
      f.total_pactado ?? f.amount ?? 0,
      `"${(f.forma_cobro || f.payment_method || "Transferencia").replace(/"/g, '""')}"`,
      f.abono_recibido ?? (f.status === "completado" ? f.amount : 0),
      f.saldo_pendiente ?? Math.max(0, (f.total_pactado ?? f.amount) - (f.abono_recibido ?? 0)),
      ...(isFirm ? [
        `${f.pct_marlon ?? 50}%`,
        `${f.pct_sebastian ?? 50}%`,
        f.marlon_recibe ?? ((f.abono_recibido ?? 0) * (f.pct_marlon ?? 50)) / 100,
        f.sebastian_recibe ?? ((f.abono_recibido ?? 0) * (f.pct_sebastian ?? 50)) / 100,
      ] : []),
      f.payment_status || (f.status === "completado" ? "Pagado" : "Pendiente"),
      f.fecha_ultimo_abono || f.date || "",
      `"${(f.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Matriz_Financiera_JALegal_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado y Ordenamiento
  const filteredFinances = useMemo(() => {
    return finances
      .filter((item) => Boolean(item.case_id))
      .filter((item) => {
        // Búsqueda
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchCase = (item.case_name || item.concept || "").toLowerCase().includes(q);
          const matchClient = (item.client_name || "").toLowerCase().includes(q);
          const matchMethod = (item.forma_cobro || item.payment_method || "").toLowerCase().includes(q);
          const matchStatus = (item.payment_status || "").toLowerCase().includes(q);
          const matchNotes = (item.notes || "").toLowerCase().includes(q);
          if (!matchCase && !matchClient && !matchMethod && !matchStatus && !matchNotes) {
            return false;
          }
        }

        // Filtro de Estado de Pago
        if (statusFilter !== "all") {
          const st = item.payment_status || (item.status === "completado" ? "Pagado" : "Pendiente");
          if (statusFilter === "pagado" && st !== "Pagado") return false;
          if (statusFilter === "abono_parcial" && st !== "Abono parcial") return false;
          if (statusFilter === "pendiente" && st !== "Pendiente") return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.fecha_ultimo_abono || a.date || "2026-01-01").getTime();
        const dateB = new Date(b.fecha_ultimo_abono || b.date || "2026-01-01").getTime();

        if (sortBy === "date_desc") {
          return dateB - dateA;
        }
        if (sortBy === "date_asc") {
          return dateA - dateB;
        }
        if (sortBy === "balance_desc") {
          const salA = a.saldo_pendiente ?? Math.max(0, (a.total_pactado ?? a.amount) - (a.abono_recibido ?? 0));
          const salB = b.saldo_pendiente ?? Math.max(0, (b.total_pactado ?? b.amount) - (b.abono_recibido ?? 0));
          return salB - salA;
        }
        if (sortBy === "pactado_desc") {
          const pacA = a.total_pactado ?? a.amount ?? 0;
          const pacB = b.total_pactado ?? b.amount ?? 0;
          return pacB - pacA;
        }
        return 0;
      });
  }, [finances, searchTerm, statusFilter, sortBy]);

  // Totales de la matriz
  const sumTotalPactado = filteredFinances.reduce((acc, f) => acc + (f.total_pactado ?? f.amount ?? 0), 0);
  const sumAbonoRecibido = filteredFinances.reduce((acc, f) => acc + (f.abono_recibido ?? (f.status === "completado" ? f.amount : 0)), 0);
  const sumSaldoPendiente = filteredFinances.reduce((acc, f) => acc + (f.saldo_pendiente ?? Math.max(0, (f.total_pactado ?? f.amount) - (f.abono_recibido ?? 0))), 0);
  const sumMarlon = filteredFinances.reduce((acc, f) => acc + (f.marlon_recibe ?? ((f.abono_recibido ?? 0) * (f.pct_marlon ?? 50)) / 100), 0);
  const sumSebastian = filteredFinances.reduce((acc, f) => acc + (f.sebastian_recibe ?? ((f.abono_recibido ?? 0) * (f.pct_sebastian ?? 50)) / 100), 0);

  return (
    <article className="portal-panel" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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
            Módulo Financiero Oficial J&amp;A Legal
          </span>
          <h2 style={{ margin: "4px 0 6px", color: "var(--text-bright)", fontSize: "1.45rem" }}>
            {isFirm ? "Control de Honorarios, Cobros & Reparto a Socios" : "Resumen de pagos del caso"}
          </h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "620px" }}>
            {isFirm ? "Matriz integral sincronizada con Supabase: pactado, abonos, saldos y reparto entre socios." : "Consulta los honorarios, abonos y saldos de tus casos."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleExportExcel}
            style={{
              padding: "10px 16px",
              background: "rgba(34, 197, 94, 0.15)",
              color: "#4ade80",
              border: "1px solid #22c55e",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Download size={15} />
            <span>Descargar Excel / CSV</span>
          </button>

          {isFirm && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="btn primary"
              style={{
                padding: "10px 18px",
                fontSize: "0.82rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Plus size={16} />
              <span>+ Honorario de caso</span>
            </button>
          )}
        </div>
      </div>

      {/* Pestañas de Vista: Matriz Excel vs Soporte de Gráficas */}
      <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid var(--line)", paddingBottom: "10px", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setActiveTab("tabla")}
          style={{
            padding: "10px 20px",
            fontSize: "0.86rem",
            fontWeight: 800,
            borderRadius: "6px",
            border: activeTab === "tabla" ? "2px solid var(--brass)" : "1px solid transparent",
            background: activeTab === "tabla" ? "rgba(217, 181, 106, 0.2)" : "rgba(15, 23, 42, 0.5)",
            color: activeTab === "tabla" ? "var(--brass-light)" : "var(--text-muted)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>📑 Matriz Financiera (Modelo Excel)</span>
          <span style={{ fontSize: "0.72rem", background: "var(--brass)", color: "var(--ink)", padding: "1px 6px", borderRadius: "10px", fontWeight: 800 }}>
            {filteredFinances.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("graficas")}
          style={{
            padding: "10px 20px",
            fontSize: "0.86rem",
            fontWeight: 800,
            borderRadius: "6px",
            border: activeTab === "graficas" ? "2px solid var(--brass)" : "1px solid transparent",
            background: activeTab === "graficas" ? "rgba(217, 181, 106, 0.2)" : "rgba(15, 23, 42, 0.5)",
            color: activeTab === "graficas" ? "var(--brass-light)" : "var(--text-muted)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>📊 Soporte de Gráficas &amp; Rendimiento</span>
          <span style={{ fontSize: "0.72rem", background: "#38bdf8", color: "#032b43", padding: "1px 6px", borderRadius: "10px", fontWeight: 800 }}>
            KPIs
          </span>
        </button>
        {isFirm && <button type="button" onClick={() => setActiveTab("contabilidad")} style={{ padding: "10px 18px", borderRadius: 7, border: activeTab === "contabilidad" ? "2px solid #38bdf8" : "1px solid transparent", background: activeTab === "contabilidad" ? "rgba(56,189,248,.16)" : "rgba(15,23,42,.5)", color: activeTab === "contabilidad" ? "#7dd3fc" : "var(--text-muted)", fontWeight: 800, cursor: "pointer" }}>🧾 Contabilidad general · {generalMovements.length}</button>}
      </div>

      {/* VISTA 1: TABLA FINANCIERA MODELO EXCEL */}
      {activeTab === "tabla" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Barra de Filtros y Búsqueda por Fecha */}
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
              padding: "12px 18px",
            }}
          >
            {/* Buscador */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 260px" }}>
              <Search size={16} color="var(--brass)" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por caso, cliente, forma de cobro u observaciones..."
                style={{
                  width: "100%",
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid var(--line)",
                  color: "var(--text-bright)",
                  padding: "8px 12px",
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

            {/* Filtros de Estado y Fecha */}
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
                <option value="all">Todos los estados de pago</option>
                <option value="pagado">Pagado (100%)</option>
                <option value="abono_parcial">Abono parcial (con saldo)</option>
                <option value="pendiente">Pendiente (Sin abono)</option>
              </select>

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
                  <option value="date_desc">📅 Fecha Último Abono (Reciente)</option>
                  <option value="date_asc">📅 Fecha Último Abono (Antigua)</option>
                  <option value="balance_desc">💰 Mayor Saldo Pendiente</option>
                  <option value="pactado_desc">💵 Mayor Valor Pactado</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLA ESTILO EXCEL IDÉNTICA A LA IMAGEN */}
          <div
            style={{
              background: "var(--ink-soft)",
              border: "2px solid #1e3a8a",
              borderRadius: "8px",
              overflow: "hidden",
              boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                  fontSize: "0.78rem",
                }}
              >
                {/* Cabecera Azul Marina Excel */}
                <thead>
                  <tr
                    style={{
                      background: "#0c284e", // Navy azul profundo como en el Excel
                      color: "#ffffff",
                      borderBottom: "2px solid #2563eb",
                      fontWeight: 700,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <th style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.15)", textAlign: "left" }}>
                      Nombre del caso
                    </th>
                    <th style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.15)", textAlign: "left" }}>
                      Cliente
                    </th>
                    <th style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                      Valor total pactado
                    </th>
                    <th style={{ padding: "12px 12px", borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                      Forma de cobro
                    </th>
                    <th style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                      Abono recibido
                    </th>
                    <th style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.15)", background: "#1e3a5f" }}>
                      Saldo pendiente
                    </th>
                    {isFirm && <>
                      <th style={{ padding: "12px 10px", borderRight: "1px solid rgba(255,255,255,0.15)" }}>% Marlon</th>
                      <th style={{ padding: "12px 10px", borderRight: "1px solid rgba(255,255,255,0.15)" }}>% Sebastián</th>
                      <th style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.15)" }}>Marlon recibe</th>
                      <th style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.15)" }}>Sebastián recibe</th>
                    </>}
                    <th style={{ padding: "12px 12px", borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                      Estado de pago
                    </th>
                    <th style={{ padding: "12px 12px", borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                      Fecha último abono
                    </th>
                    <th style={{ padding: "12px 14px", borderRight: "1px solid rgba(255,255,255,0.15)", textAlign: "left" }}>
                      Observaciones
                    </th>
                    {isFirm && <th style={{ padding: "12px 12px" }}>Acciones</th>}
                  </tr>
                </thead>

                {/* Filas de Datos */}
                <tbody>
                  {filteredFinances.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        No hay registros que coincidan con los criterios de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredFinances.map((item, idx) => {
                      const totalPac = item.total_pactado ?? item.amount ?? 0;
                      const abonoRec = item.abono_recibido ?? (item.status === "completado" ? item.amount : 0);
                      const saldoPend = item.saldo_pendiente ?? Math.max(0, totalPac - abonoRec);

                      const pMarlon = item.pct_marlon ?? 50;
                      const pSebas = item.pct_sebastian ?? (100 - pMarlon);

                      const marlonAmt = item.marlon_recibe ?? Math.round((abonoRec * pMarlon) / 100);
                      const sebasAmt = item.sebastian_recibe ?? Math.round((abonoRec * pSebas) / 100);

                      const estPago = item.payment_status || (abonoRec >= totalPac ? "Pagado" : abonoRec > 0 ? "Abono parcial" : "Pendiente");

                      // Colores exactos del Excel
                      const rowBg = idx % 2 === 0 ? "rgba(15, 23, 42, 0.4)" : "rgba(30, 41, 59, 0.4)";
                      const isPartial = estPago === "Abono parcial";
                      const isPending = estPago === "Pendiente";
                      const isPaid = estPago === "Pagado";

                      return (
                        <tr
                          key={item.id}
                          style={{
                            background: rowBg,
                            borderBottom: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          {/* Nombre del caso */}
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "var(--text-bright)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {item.case_name || item.concept}
                          </td>

                          {/* Cliente */}
                          <td style={{ padding: "10px 14px", color: "var(--text-muted)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            <strong style={{ color: "var(--text-bright)" }}>{item.client_name}</strong>
                          </td>

                          {/* Valor total pactado */}
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "var(--text-bright)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {formatCOP(totalPac)}
                          </td>

                          {/* Forma de cobro */}
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-muted)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {item.forma_cobro || item.payment_method || "Transferencia"}
                          </td>

                          {/* Abono recibido */}
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#4ade80", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {formatCOP(abonoRec)}
                          </td>

                          {/* Saldo pendiente (Con fondo ámbar suave en Excel si hay saldo) */}
                          <td
                            style={{
                              padding: "10px 14px",
                              textAlign: "right",
                              fontWeight: 800,
                              background: saldoPend > 0 ? "rgba(254, 240, 138, 0.15)" : "transparent",
                              color: saldoPend > 0 ? "#facc15" : "#4ade80",
                              borderRight: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            {formatCOP(saldoPend)}
                          </td>

                          {isFirm && <>
                          {/* % Marlon */}
                          <td style={{ padding: "10px 10px", textAlign: "center", color: "#60a5fa", fontWeight: 600, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {pMarlon}%
                          </td>

                          {/* % Sebastián */}
                          <td style={{ padding: "10px 10px", textAlign: "center", color: "#c084fc", fontWeight: 600, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {pSebas}%
                          </td>

                          {/* Marlon recibe */}
                          <td style={{ padding: "10px 14px", textAlign: "right", color: "#93c5fd", fontWeight: 700, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {formatCOP(marlonAmt)}
                          </td>

                          {/* Sebastián recibe */}
                          <td style={{ padding: "10px 14px", textAlign: "right", color: "#e9d5ff", fontWeight: 700, borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {formatCOP(sebasAmt)}
                          </td>
                          </>}

                          {/* Estado de pago (Badges estilizados idénticos a los del Excel) */}
                          <td style={{ padding: "10px 12px", textAlign: "center", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                fontSize: "0.72rem",
                                fontWeight: 800,
                                background: isPaid
                                  ? "#dcfce7" // Verde pastel Excel
                                  : isPartial
                                  ? "#e0f2fe" // Celeste pastel Excel
                                  : "#ffedd5", // Naranja pastel Excel
                                color: isPaid
                                  ? "#166534"
                                  : isPartial
                                  ? "#0369a1"
                                  : "#9a3412",
                                border: `1px solid ${
                                  isPaid ? "#86efac" : isPartial ? "#7dd3fc" : "#fdba74"
                                }`,
                              }}
                            >
                              {estPago}
                            </span>
                          </td>

                          {/* Fecha último abono */}
                          <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--text-bright)", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {formatDateDisplay(item.fecha_ultimo_abono || item.date)}
                          </td>

                          {/* Observaciones */}
                          <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: "0.74rem", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                            {item.notes || "—"}
                          </td>

                          {/* Acciones */}
                          {isFirm && (
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(item)}
                                  title="Editar registro en Supabase"
                                  style={{
                                    padding: "5px 8px",
                                    background: "rgba(217, 181, 106, 0.15)",
                                    border: "1px solid var(--brass)",
                                    color: "var(--brass-light)",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item.id, item.case_name || item.concept)}
                                  title="Eliminar de Supabase"
                                  style={{
                                    padding: "5px 8px",
                                    background: "rgba(239, 68, 68, 0.15)",
                                    border: "1px solid rgba(239, 68, 68, 0.4)",
                                    color: "#f87171",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Fila Totalizadora Inferior */}
                <tfoot>
                  <tr
                    style={{
                      background: "#0c284e",
                      borderTop: "2px solid #2563eb",
                      color: "#ffffff",
                      fontWeight: 800,
                    }}
                  >
                    <td style={{ padding: "12px 14px" }} colSpan={2}>
                      TOTAL CONSOLIDADO ({filteredFinances.length} Casos)
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--brass-light)" }}>
                      {formatCOP(sumTotalPactado)}
                    </td>
                    <td style={{ padding: "12px 12px", textAlign: "center" }}>—</td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#4ade80" }}>
                      {formatCOP(sumAbonoRecibido)}
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", color: "#facc15" }}>
                      {formatCOP(sumSaldoPendiente)}
                    </td>
                    {isFirm && <>
                      <td style={{ padding: "12px 10px", textAlign: "center" }}>—</td>
                      <td style={{ padding: "12px 10px", textAlign: "center" }}>—</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#93c5fd" }}>{formatCOP(sumMarlon)}</td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "#e9d5ff" }}>{formatCOP(sumSebastian)}</td>
                    </>}
                    <td colSpan={isFirm ? 4 : 3} style={{ padding: "12px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.74rem" }}>
                      Sincronizado en tiempo real con Supabase
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "contabilidad" && isFirm && (
        <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", padding: 20, border: "1px solid var(--line)", borderRadius: 12, background: "linear-gradient(135deg, rgba(56,189,248,.12), var(--ink-soft) 65%)" }}>
            <div><span className="kicker" style={{ color: "#7dd3fc", fontWeight: 800 }}>REGISTRO INDEPENDIENTE DE EXPEDIENTES</span><h3 style={{ margin: "5px 0", color: "var(--text-bright)" }}>Ingresos y egresos del despacho</h3><p style={{ margin: 0, color: "var(--text-muted)", fontSize: ".82rem" }}>Registra caja, pagos operativos, reembolsos y otros movimientos con beneficiario y motivo.</p></div>
            <button type="button" onClick={() => openAccountingModal()} className="btn primary" style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Plus size={16}/> Registrar movimiento</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12 }}>
            {[{label:"Ingresos generales",amount:accountingIncome,color:"#4ade80"},{label:"Egresos generales",amount:accountingExpenses,color:"#f87171"},{label:"Balance neto",amount:accountingIncome-accountingExpenses,color:accountingIncome-accountingExpenses>=0?"#7dd3fc":"#f87171"}].map((card)=><div key={card.label} style={{ padding: 17, borderRadius: 10, background: "var(--ink-panel)", border: "1px solid var(--line)" }}><div style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>{card.label}</div><strong style={{ display:"block", color:card.color, fontSize:"1.15rem", marginTop:7 }}>{formatCOP(card.amount)}</strong><small style={{ color:"var(--text-muted)" }}>Movimientos sin expediente asociado</small></div>)}
          </div>

          <div style={{ display:"flex", gap:10, flexWrap:"wrap", padding:12, borderRadius:9, background:"var(--parchment-deep)", border:"1px solid var(--line)" }}>
            <input value={accountingSearch} onChange={(e)=>setAccountingSearch(e.target.value)} placeholder="Buscar beneficiario, motivo, categoría o nota…" style={{ flex:"1 1 260px", minWidth:0, padding:10, background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)" }}/>
            <select value={accountingTypeFilter} onChange={(e)=>setAccountingTypeFilter(e.target.value as "all"|"ingreso"|"egreso")} style={{ padding:"9px 12px", background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)" }}><option value="all">Ingresos y egresos</option><option value="ingreso">Solo ingresos</option><option value="egreso">Solo egresos</option></select>
          </div>

          <div style={{ overflowX:"auto", border:"1px solid var(--line)", borderRadius:10 }}><table style={{ width:"100%", minWidth:900, borderCollapse:"collapse", fontSize:".8rem" }}><thead><tr style={{ background:"var(--ink-panel)", color:"var(--text-muted)", textAlign:"left" }}>{["Fecha","Movimiento","Categoría","Beneficiario / origen","Motivo / descripción","Medio","Valor","Acciones"].map(h=><th key={h} style={{ padding:"12px 10px", borderBottom:"1px solid var(--line)" }}>{h}</th>)}</tr></thead><tbody>
            {accountingVisibleMovements.length===0 ? <tr><td colSpan={8} style={{ padding:36, textAlign:"center", color:"var(--text-muted)" }}>Aún no hay movimientos generales. Registra el primer ingreso o egreso del despacho.</td></tr> : accountingVisibleMovements.map((record)=><tr key={record.id} style={{ borderBottom:"1px solid var(--line)" }}><td style={{ padding:"12px 10px", whiteSpace:"nowrap" }}>{formatDateDisplay(record.date)}</td><td style={{ padding:"12px 10px", color:record.type==="ingreso"?"#4ade80":"#f87171", fontWeight:800 }}>{record.type==="ingreso"?"＋ Ingreso":"− Egreso"}</td><td style={{ padding:"12px 10px" }}>{record.category}</td><td style={{ padding:"12px 10px", fontWeight:700 }}>{record.client_name||"—"}</td><td style={{ padding:"12px 10px", minWidth:180 }}>{record.concept}<div style={{ color:"var(--text-muted)", fontSize:".72rem", marginTop:3 }}>{record.notes||""}</div></td><td style={{ padding:"12px 10px" }}>{record.payment_method}</td><td style={{ padding:"12px 10px", whiteSpace:"nowrap", fontWeight:800, color:record.type==="ingreso"?"#4ade80":"#f87171" }}>{record.type==="egreso"?"−":"＋"}{formatCOP(record.amount)}</td><td style={{ padding:"12px 10px" }}><div style={{ display:"flex", gap:6 }}><button type="button" title="Editar movimiento" onClick={()=>openAccountingModal(record)} style={{ padding:6, background:"transparent", border:"1px solid var(--line)", color:"var(--text-bright)", borderRadius:5, cursor:"pointer" }}><Edit size={14}/></button><button type="button" title="Eliminar movimiento" onClick={()=>handleDelete(record.id,record.concept)} style={{ padding:6, background:"transparent", border:"1px solid rgba(248,113,113,.35)", color:"#f87171", borderRadius:5, cursor:"pointer" }}><Trash2 size={14}/></button></div></td></tr>)}
            </tbody><tfoot><tr style={{ background:"var(--ink-panel)", fontWeight:800 }}><td colSpan={6} style={{ padding:12 }}>Historial visible ({accountingVisibleMovements.length} movimientos)</td><td colSpan={2} style={{ padding:12, color:"var(--text-bright)" }}>Ingresos {formatCOP(accountingVisibleMovements.filter(m=>m.type==="ingreso").reduce((s,m)=>s+m.amount,0))} · Egresos {formatCOP(accountingVisibleMovements.filter(m=>m.type==="egreso").reduce((s,m)=>s+m.amount,0))}</td></tr></tfoot></table></div>
        </section>
      )}

      {/* VISTA 2: SOPORTE DE GRÁFICAS DE LO FINANCIERO */}
      {activeTab === "graficas" && (
        <FinancialCharts finances={filteredFinances} isFirm={isFirm} />
      )}

      {/* ======================================================== */}
      {/* MODAL EDITAR / CREAR REGISTRO FINANCIERO */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--ink-soft)",
              border: "2px solid var(--brass)",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "600px",
              padding: "24px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <h3 style={{ margin: 0, color: "var(--text-bright)", fontSize: "1.15rem" }}>
                {editingRecord ? "✏️ Editar Registro Financiero & Honorarios" : "➕ Nuevo Registro Financiero (Modelo Excel)"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Nombre del Caso:
                </label>
                <input
                  type="text"
                  required
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  placeholder="Ej. PROCESO PERTENENCIA MANUEL SALVADOR"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    color: "var(--text-bright)",
                    fontSize: "0.84rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Cliente Titular:
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. MANUEL SALVADOR"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    color: "var(--text-bright)",
                    fontSize: "0.84rem",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Valor Total Pactado ($ COP):
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={totalPactado}
                    onChange={(e) => setTotalPactado(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: "var(--text-bright)",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Forma de Cobro:
                  </label>
                  <select
                    value={formaCobro}
                    onChange={(e) => setFormaCobro(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: "var(--text-bright)",
                      fontSize: "0.84rem",
                    }}
                  >
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="PSE">PSE / Davivienda / Bancolombia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Cheque">Cheque de Gerencia</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#4ade80", marginBottom: "4px", fontWeight: 700 }}>
                    Abono Recibido ($ COP):
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={abonoRecibido}
                    onChange={(e) => setAbonoRecibido(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid #22c55e",
                      borderRadius: "6px",
                      color: "#4ade80",
                      fontSize: "0.84rem",
                      fontWeight: 800,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "#f87171", marginBottom: "4px", fontWeight: 700 }}>
                    Saldo Pendiente (Automático):
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formatCOP(saldoPendiente)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "6px",
                      color: saldoPendiente > 0 ? "#f87171" : "#4ade80",
                      fontSize: "0.84rem",
                      fontWeight: 800,
                    }}
                  />
                </div>
              </div>

              {isFirm && <>{/* Porcentajes entre Socios */}
              <div
                style={{
                  background: "rgba(15, 23, 42, 0.6)",
                  border: "1px solid var(--line)",
                  borderRadius: "8px",
                  padding: "14px",
                }}
              >
                <span style={{ fontSize: "0.75rem", color: "var(--brass-light)", fontWeight: 700, display: "block", marginBottom: "10px" }}>
                  ⚖️ Reparto entre Socios Titulares:
                </span>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#60a5fa", marginBottom: "4px" }}>
                      % Marlon Jiménez:
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={pctMarlon}
                      onChange={(e) => setPctMarlon(Number(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        background: "rgba(15, 23, 42, 0.8)",
                        border: "1px solid #38bdf8",
                        borderRadius: "4px",
                        color: "#93c5fd",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                      }}
                    />
                    <small style={{ color: "#7dd3fc", fontSize: "0.7rem", marginTop: "2px", display: "block" }}>
                      Recibe: <strong>{formatCOP(marlonRecibe)}</strong>
                    </small>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", color: "#c084fc", marginBottom: "4px" }}>
                      % Felipe Sebastián Ariza:
                    </label>
                    <input
                      type="number"
                      readOnly
                      value={pctSebastian}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        background: "rgba(15, 23, 42, 0.8)",
                        border: "1px solid #c084fc",
                        borderRadius: "4px",
                        color: "#e9d5ff",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                      }}
                    />
                    <small style={{ color: "#f3e8ff", fontSize: "0.7rem", marginTop: "2px", display: "block" }}>
                      Recibe: <strong>{formatCOP(sebastianRecibe)}</strong>
                    </small>
                  </div>
                </div>
              </div></>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Fecha Último Abono:
                  </label>
                  <input
                    type="date"
                    value={fechaUltimoAbono}
                    onChange={(e) => setFechaUltimoAbono(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: "var(--text-bright)",
                      fontSize: "0.84rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Estado de Pago (Automático):
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={calculatedStatus}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "rgba(15, 23, 42, 0.7)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      color: calculatedStatus === "Pagado" ? "#4ade80" : calculatedStatus === "Abono parcial" ? "#38bdf8" : "#f87171",
                      fontSize: "0.84rem",
                      fontWeight: 800,
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Observaciones:
                </label>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Ej. A LA ESPERA DE LOS PAGOS / Pago 100% satisfecho..."
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "rgba(15, 23, 42, 0.7)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    color: "var(--text-bright)",
                    fontSize: "0.82rem",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    background: "transparent",
                    color: "var(--text-muted)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  style={{
                    padding: "8px 20px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                  }}
                >
                  Guardar en Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {accountingModalOpen && isFirm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(2,6,16,.78)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:10000, padding:16 }}>
          <form onSubmit={handleSaveAccountingMovement} style={{ width:"100%", maxWidth:620, maxHeight:"92vh", overflowY:"auto", padding:24, border:"1px solid #38bdf8", borderRadius:14, background:"var(--ink-soft)", boxShadow:"0 24px 80px rgba(0,0,0,.55)", display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid var(--line)", paddingBottom:12 }}><div><span style={{ color:"#7dd3fc", fontSize:".72rem", fontWeight:800, letterSpacing:".08em" }}>CONTABILIDAD GENERAL</span><h3 style={{ margin:"4px 0 0", color:"var(--text-bright)" }}>{editingAccountingRecord?"Editar movimiento":"Registrar ingreso o egreso"}</h3></div><button type="button" onClick={()=>setAccountingModalOpen(false)} style={{ background:"transparent", border:0, color:"var(--text-muted)", cursor:"pointer" }}><X size={20}/></button></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:".8rem", color:"var(--text-muted)" }}>Tipo de movimiento<select value={accountingType} onChange={(e)=>{const type=e.target.value as "ingreso"|"egreso";setAccountingType(type);setAccountingCategory(type==="ingreso"?"Ingreso de servicios":"Operativo Despacho");}} style={{ padding:10, background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)" }}><option value="ingreso">Ingreso</option><option value="egreso">Egreso</option></select></label>
              <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:".8rem", color:"var(--text-muted)" }}>Categoría<select required value={accountingCategory} onChange={(e)=>setAccountingCategory(e.target.value)} style={{ padding:10, background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)" }}>{(accountingType==="ingreso"?["Ingreso de servicios","Reembolso","Intereses","Venta de activo","Otro ingreso"]:["Operativo Despacho","Arriendo","Servicios públicos","Nómina / Honorarios","Transporte","Papelería","Impuestos","Peritaje","Otro egreso"]).map((category)=><option key={category} value={category}>{category}</option>)}</select></label>
            </div>
            <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:".8rem", color:"var(--text-muted)" }}>{accountingType==="egreso"?"Beneficiario / quién recibe el pago":"Quién paga / origen del ingreso"}<input required value={accountingBeneficiary} onChange={(e)=>setAccountingBeneficiary(e.target.value)} placeholder="Nombre de la persona o entidad" style={{ padding:10, background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)" }}/></label>
            <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:".8rem", color:"var(--text-muted)" }}>Motivo del movimiento<input required value={accountingReason} onChange={(e)=>setAccountingReason(e.target.value)} placeholder="Ej. Pago de arriendo de oficina, compra de papelería…" style={{ padding:10, background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)" }}/></label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:".8rem", color:"var(--text-muted)" }}>Valor (COP)<input required type="number" min="1" value={accountingAmount||""} onChange={(e)=>setAccountingAmount(Number(e.target.value))} placeholder="0" style={{ padding:10, background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)" }}/></label>
              <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:".8rem", color:"var(--text-muted)" }}>Fecha<input required type="date" value={accountingDate} onChange={(e)=>setAccountingDate(e.target.value)} style={{ padding:10, background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)" }}/></label>
            </div>
            <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:".8rem", color:"var(--text-muted)" }}>Medio de pago<select value={accountingMethod} onChange={(e)=>setAccountingMethod(e.target.value)} style={{ padding:10, background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)" }}>{["Transferencia Bancaria","PSE","Efectivo","Cheque","Tarjeta","Otro"].map((method)=><option key={method}>{method}</option>)}</select></label>
            <label style={{ display:"flex", flexDirection:"column", gap:6, fontSize:".8rem", color:"var(--text-muted)" }}>Notas y referencia<textarea rows={3} value={accountingNotes} onChange={(e)=>setAccountingNotes(e.target.value)} placeholder="Número de comprobante, referencia bancaria o detalle adicional" style={{ padding:10, background:"var(--ink-panel)", border:"1px solid var(--line)", borderRadius:6, color:"var(--text-bright)", resize:"vertical" }}/></label>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:6 }}><button type="button" onClick={()=>setAccountingModalOpen(false)} className="btn">Cancelar</button><button type="submit" className="btn primary" disabled={accountingAmount<=0||!accountingReason.trim()||!accountingBeneficiary.trim()}>{editingAccountingRecord?"Guardar cambios":"Guardar en historial"}</button></div>
          </form>
        </div>
      )}
    </article>
  );
}
