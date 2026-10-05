import { useState } from "react";
import { FinancialRecord, Profile, CaseRecord } from "../types/portal";
import { firm } from "../data/site";
import { FileText, CheckCircle2, ArrowRight } from "./icons";

interface FinanceSectionProps {
  finances: FinancialRecord[];
  onAddTransaction: (record: FinancialRecord) => void;
  onDeleteTransaction: (id: string) => void;
  userProfile: Profile | null;
  caseRecord: CaseRecord | null;
}

function formatCOP(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);
}

function formatLongDate(dateStr: string) {
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

export function FinanceSection({
  finances,
  onAddTransaction,
  onDeleteTransaction,
  userProfile,
  caseRecord,
}: FinanceSectionProps) {
  const isFirm = userProfile?.role === "firm";
  const [filterType, setFilterType] = useState<"all" | "ingreso" | "egreso">("all");
  const [selectedReceipt, setSelectedReceipt] = useState<FinancialRecord | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Form states
  const [type, setType] = useState<"ingreso" | "egreso">("ingreso");
  const [category, setCategory] = useState<FinancialRecord["category"]>("Honorarios");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<FinancialRecord["payment_method"]>("Transferencia Bancaria");
  const [clientName, setClientName] = useState(caseRecord ? "Dr. Roberto Mendoza Vargas" : "");
  const [notes, setNotes] = useState("");

  // Totales
  const totalIngresos = finances
    .filter((f) => f.type === "ingreso")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalEgresos = finances
    .filter((f) => f.type === "egreso")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const utilidadNeta = totalIngresos - totalEgresos;

  // Filtrado según vista
  const displayedFinances = finances.filter((item) => {
    if (!isFirm && item.case_id && caseRecord?.id && item.case_id !== caseRecord.id) {
      return false;
    }
    if (filterType === "all") return true;
    return item.type === filterType;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount.replace(/\D/g, ""));
    if (!concept || isNaN(num) || num <= 0) {
      alert("Por favor ingrese un concepto y un valor válido en COP.");
      return;
    }

    const receiptNum =
      type === "ingreso"
        ? `REC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
        : `EGR-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newRecord: FinancialRecord = {
      id: "fin_" + Date.now(),
      case_id: caseRecord?.id,
      client_name: clientName || (caseRecord ? "Cliente Asignado" : "Despacho"),
      type,
      category,
      concept,
      amount: num,
      date,
      status: "completado",
      payment_method: paymentMethod,
      receipt_number: receiptNum,
      notes,
    };

    onAddTransaction(newRecord);
    setIsNewModalOpen(false);
    // Reset
    setConcept("");
    setAmount("");
    setNotes("");
  };

  const handleExportCSV = () => {
    const headers = ["Fecha", "Tipo", "Categoria", "Concepto", "Cliente/Destinatario", "Metodo Pago", "Monto COP", "Nro Recibo", "Notas"];
    const rows = displayedFinances.map((f) => [
      f.date,
      f.type.toUpperCase(),
      f.category,
      `"${(f.concept || "").replace(/"/g, '""')}"`,
      `"${(f.client_name || "").replace(/"/g, '""')}"`,
      f.payment_method,
      f.amount,
      f.receipt_number,
      `"${(f.notes || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Reporte_Financiero_JALegal_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <article className="portal-panel">
      {/* Encabezado */}
      <div className="panel-title-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <p className="kicker">Gestión Económica & Control de Honorarios</p>
          <h2 style={{ margin: "4px 0 0", color: "var(--text-bright)" }}>
            {isFirm ? "Economía y Balances del Bufete" : "Estado de Cuenta & Pagos de Honorarios"}
          </h2>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              background: "transparent",
              border: "1px solid var(--brass)",
              color: "var(--brass-light)",
              padding: "9px 14px",
              borderRadius: "4px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            title="Exportar base de datos a formato compatible con Microsoft Excel"
          >
            <span>📊 Exportar a Excel (CSV)</span>
          </button>
          {isFirm && (
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              style={{
                background: "var(--brass)",
                color: "var(--ink)",
                fontWeight: 600,
                border: "none",
                padding: "10px 18px",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>+ Registrar Movimiento</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra de Analítica de Flujo */}
      <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--line)", padding: "12px 16px", borderRadius: "6px", marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "8px" }}>
          <span style={{ color: "var(--text-muted)" }}>
            📈 <strong>Analítica Operativa:</strong> Eficiencia de Recaudo vs Gastos
          </span>
          <span style={{ color: "#4ade80", fontWeight: 700 }}>
            {totalIngresos + totalEgresos > 0 ? ((totalIngresos / (totalIngresos + totalEgresos)) * 100).toFixed(1) : 100}% Tasa Neta
          </span>
        </div>
        <div style={{ height: "8px", width: "100%", background: "#ef4444", borderRadius: "4px", overflow: "hidden", display: "flex" }}>
          <div
            style={{
              height: "100%",
              background: "#22c55e",
              width: `${totalIngresos + totalEgresos > 0 ? (totalIngresos / (totalIngresos + totalEgresos)) * 100 : 100}%`,
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {/* Tarjetas de Métricas Económicas */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginTop: "20px",
          marginBottom: "24px",
        }}
      >
        {isFirm ? (
          <>
            <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--line)", padding: "16px", borderRadius: "4px" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                Total Recaudado (Ingresos)
              </span>
              <p style={{ fontSize: "1.45rem", fontWeight: 700, color: "#4ade80", margin: "8px 0 0", fontFamily: "var(--font-heading)" }}>
                {formatCOP(totalIngresos)}
              </p>
              <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Cobros por honorarios y anticipos</small>
            </div>

            <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--line)", padding: "16px", borderRadius: "4px" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                Gastos del Despacho (Egresos)
              </span>
              <p style={{ fontSize: "1.45rem", fontWeight: 700, color: "#f87171", margin: "8px 0 0", fontFamily: "var(--font-heading)" }}>
                {formatCOP(totalEgresos)}
              </p>
              <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Peritajes, notarías y suministros</small>
            </div>

            <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--brass)", padding: "16px", borderRadius: "4px" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--brass)", letterSpacing: "0.05em", fontWeight: 600 }}>
                Utilidad Neta / Flujo Caja
              </span>
              <p style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--brass-glow)", margin: "8px 0 0", fontFamily: "var(--font-heading)" }}>
                {formatCOP(utilidadNeta)}
              </p>
              <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Margen operativo del ejercicio</small>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--line)", padding: "16px", borderRadius: "4px" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                Honorarios Acordados del Caso
              </span>
              <p style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--text-bright)", margin: "8px 0 0", fontFamily: "var(--font-heading)" }}>
                {formatCOP(caseRecord?.total_fees || 18000000)}
              </p>
              <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Etapa procesal completa</small>
            </div>

            <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--line)", padding: "16px", borderRadius: "4px" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
                Total Abonado a la Fecha
              </span>
              <p style={{ fontSize: "1.45rem", fontWeight: 700, color: "#4ade80", margin: "8px 0 0", fontFamily: "var(--font-heading)" }}>
                {formatCOP(
                  finances
                    .filter((f) => f.type === "ingreso" && f.case_id === caseRecord?.id)
                    .reduce((a, b) => a + b.amount, 0) || 13500000
                )}
              </p>
              <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Abonos con soporte oficial</small>
            </div>

            <div style={{ background: "var(--parchment-deep)", border: "1px solid var(--brass)", padding: "16px", borderRadius: "4px" }}>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--brass)", letterSpacing: "0.05em", fontWeight: 600 }}>
                Saldo Pendiente
              </span>
              <p style={{ fontSize: "1.45rem", fontWeight: 700, color: "#f87171", margin: "8px 0 0", fontFamily: "var(--font-heading)" }}>
                {formatCOP(caseRecord?.balance || 4500000)}
              </p>
              <small style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>Pagadero según avance fijado</small>
            </div>
          </>
        )}
      </div>

      {/* Filtros rápidos */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>Filtrar:</span>
        <button
          type="button"
          onClick={() => setFilterType("all")}
          style={{
            background: filterType === "all" ? "var(--brass)" : "var(--parchment-deep)",
            color: filterType === "all" ? "var(--ink)" : "var(--text-bright)",
            border: "1px solid var(--line)",
            padding: "5px 12px",
            borderRadius: "3px",
            fontSize: "0.75rem",
            cursor: "pointer",
            fontWeight: filterType === "all" ? 600 : 400,
          }}
        >
          Todos ({finances.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType("ingreso")}
          style={{
            background: filterType === "ingreso" ? "#22c55e" : "var(--parchment-deep)",
            color: filterType === "ingreso" ? "#000" : "var(--text-bright)",
            border: "1px solid var(--line)",
            padding: "5px 12px",
            borderRadius: "3px",
            fontSize: "0.75rem",
            cursor: "pointer",
            fontWeight: filterType === "ingreso" ? 600 : 400,
          }}
        >
          Ingresos / Pagos
        </button>
        {isFirm && (
          <button
            type="button"
            onClick={() => setFilterType("egreso")}
            style={{
              background: filterType === "egreso" ? "#ef4444" : "var(--parchment-deep)",
              color: filterType === "egreso" ? "#fff" : "var(--text-bright)",
              border: "1px solid var(--line)",
              padding: "5px 12px",
              borderRadius: "3px",
              fontSize: "0.75rem",
              cursor: "pointer",
              fontWeight: filterType === "egreso" ? 600 : 400,
            }}
          >
            Gastos Despacho
          </button>
        )}
      </div>

      {/* Tabla de Movimientos */}
      <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "4px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--line)", color: "var(--text-muted)" }}>
              <th style={{ padding: "10px 14px" }}>Fecha</th>
              <th style={{ padding: "10px 14px" }}>Tipo</th>
              <th style={{ padding: "10px 14px" }}>Concepto</th>
              <th style={{ padding: "10px 14px" }}>Método</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>Monto (COP)</th>
              <th style={{ padding: "10px 14px", textAlign: "center" }}>Comprobante</th>
              {isFirm && <th style={{ padding: "10px 14px", textAlign: "center" }}>Acción</th>}
            </tr>
          </thead>
          <tbody>
            {displayedFinances.length === 0 ? (
              <tr>
                <td colSpan={isFirm ? 7 : 6} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                  No se encontraron movimientos con el filtro seleccionado.
                </td>
              </tr>
            ) : (
              displayedFinances.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--line)", background: "var(--parchment-deep)" }}>
                  <td style={{ padding: "12px 14px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    {formatLongDate(item.date)}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: "3px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        background: item.type === "ingreso" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        color: item.type === "ingreso" ? "#4ade80" : "#f87171",
                        border: item.type === "ingreso" ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(239, 68, 68, 0.3)",
                      }}
                    >
                      {item.type === "ingreso" ? "Ingreso" : "Gasto"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <strong style={{ color: "var(--text-bright)", display: "block" }}>{item.concept}</strong>
                    <small style={{ color: "var(--brass)", fontSize: "0.72rem" }}>
                      {item.category} {item.client_name ? `• ${item.client_name}` : ""}
                    </small>
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    {item.payment_method}
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: item.type === "ingreso" ? "#4ade80" : "#f87171",
                    }}
                  >
                    {item.type === "ingreso" ? "+" : "-"} {formatCOP(item.amount)}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(item)}
                      style={{
                        background: "transparent",
                        border: "1px solid var(--line)",
                        color: "var(--brass)",
                        padding: "4px 10px",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "0.72rem",
                        fontWeight: 500,
                      }}
                    >
                      {item.receipt_number}
                    </button>
                  </td>
                  {isFirm && (
                    <td style={{ padding: "12px 14px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar movimiento "${item.concept}"?`)) {
                            onDeleteTransaction(item.id);
                          }
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          fontSize: "0.75rem",
                          padding: "2px 6px",
                        }}
                        title="Eliminar registro"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Registrar Nuevo Movimiento (Solo Abogados/Firma) */}
      {isNewModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#0c1526",
              border: "1px solid var(--brass)",
              borderRadius: "6px",
              maxWidth: "520px",
              width: "100%",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "var(--brass-glow)", fontFamily: "var(--font-heading)" }}>
                Registrar Movimiento Económico
              </h3>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Tipo de Transacción
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as "ingreso" | "egreso")}
                    style={{ width: "100%", padding: "8px", marginTop: "4px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "#fff", borderRadius: "3px" }}
                  >
                    <option value="ingreso">Ingreso (Cobro / Honorarios)</option>
                    <option value="egreso">Egreso (Gasto del Despacho)</option>
                  </select>
                </label>

                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Categoría
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    style={{ width: "100%", padding: "8px", marginTop: "4px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "#fff", borderRadius: "3px" }}
                  >
                    {type === "ingreso" ? (
                      <>
                        <option value="Honorarios">Honorarios</option>
                        <option value="Anticipo">Anticipo</option>
                        <option value="Cuota de Honorarios">Cuota de Honorarios</option>
                        <option value="Costas Procesales">Costas Procesales Ganadas</option>
                      </>
                    ) : (
                      <>
                        <option value="Gastos Notaría / Registro">Gastos Notaría / Registro</option>
                        <option value="Peritaje Judicial">Peritaje Judicial</option>
                        <option value="Viáticos y Transporte">Viáticos y Transporte</option>
                        <option value="Operativo Despacho">Operativo Despacho / Suscripciones</option>
                      </>
                    )}
                  </select>
                </label>
              </div>

              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Concepto o Descripción Detallada *
                <input
                  type="text"
                  required
                  placeholder="Ej: Abono segunda cuota honorarios demanda civil..."
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  style={{ width: "100%", padding: "8px", marginTop: "4px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "#fff", borderRadius: "3px" }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Monto en Pesos Colombianos ($ COP) *
                  <input
                    type="number"
                    required
                    placeholder="Ej: 3500000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ width: "100%", padding: "8px", marginTop: "4px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "#fff", borderRadius: "3px" }}
                  />
                </label>

                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Fecha de Transacción
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ width: "100%", padding: "8px", marginTop: "4px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "#fff", borderRadius: "3px" }}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Medio de Pago
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    style={{ width: "100%", padding: "8px", marginTop: "4px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "#fff", borderRadius: "3px" }}
                  >
                    <option value="Transferencia Bancaria">Transferencia Bancaria (Bancolombia / Davivienda)</option>
                    <option value="PSE">PSE / Pasarela Virtual</option>
                    <option value="Efectivo">Efectivo en Caja</option>
                    <option value="Cheque">Cheque de Gerencia</option>
                  </select>
                </label>

                <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Cliente / Destinatario
                  <input
                    type="text"
                    placeholder="Nombre del cliente o entidad"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    style={{ width: "100%", padding: "8px", marginTop: "4px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "#fff", borderRadius: "3px" }}
                  />
                </label>
              </div>

              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Observaciones o N° de Aprobación Bancaria
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales, número de cuenta, referencia..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: "100%", padding: "8px", marginTop: "4px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "#fff", borderRadius: "3px" }}
                />
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text-muted)", padding: "8px 14px", borderRadius: "3px", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ background: "var(--brass)", color: "var(--ink)", fontWeight: 600, border: "none", padding: "8px 18px", borderRadius: "3px", cursor: "pointer" }}
                >
                  Guardar Registro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Comprobante Oficial de Pago / Recibo de Caja */}
      {selectedReceipt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1100,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              color: "#1a202c",
              borderRadius: "6px",
              maxWidth: "600px",
              width: "100%",
              padding: "32px",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              maxHeight: "90vh",
              overflowY: "auto",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {/* Encabezado del Recibo */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #0f2744", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f2744", fontWeight: 700, letterSpacing: "-0.01em" }}>
                  {firm.name}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                  NIT: 901.482.119-4 · Personería Jurídica Vigente
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                  {firm.address} · {firm.phone}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700 }}>
                  {selectedReceipt.type === "ingreso" ? "Recibo de Caja" : "Comprobante de Egreso"}
                </span>
                <p style={{ margin: "4px 0 0", fontSize: "1.1rem", fontWeight: 800, color: "#b38234" }}>
                  {selectedReceipt.receipt_number}
                </p>
                <small style={{ color: "#64748b", fontSize: "0.75rem" }}>
                  Fecha: {formatLongDate(selectedReceipt.date)}
                </small>
              </div>
            </div>

            {/* Cuerpo del Recibo */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.88rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", padding: "10px 14px", borderRadius: "4px" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>
                  {selectedReceipt.type === "ingreso" ? "Recibido de:" : "Pagado a:"}
                </span>
                <strong style={{ color: "#0f2744" }}>
                  {selectedReceipt.client_name || "Titular del Proceso"}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", padding: "10px 14px", borderRadius: "4px" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>Por concepto de:</span>
                <strong style={{ color: "#0f2744", textAlign: "right", maxWidth: "65%" }}>
                  {selectedReceipt.concept}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", background: "#f8fafc", padding: "10px 14px", borderRadius: "4px" }}>
                <span style={{ color: "#64748b", fontWeight: 500 }}>Medio de Pago:</span>
                <span style={{ color: "#0f2744", fontWeight: 600 }}>{selectedReceipt.payment_method}</span>
              </div>

              {selectedReceipt.notes && (
                <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "4px" }}>
                  <span style={{ color: "#64748b", fontWeight: 500, fontSize: "0.75rem", display: "block" }}>
                    Observaciones y Referencias:
                  </span>
                  <span style={{ color: "#334155", fontSize: "0.82rem" }}>{selectedReceipt.notes}</span>
                </div>
              )}

              {/* Monto Destacado */}
              <div
                style={{
                  marginTop: "12px",
                  padding: "16px",
                  background: "#f1f5f9",
                  borderLeft: "4px solid #b38234",
                  borderRadius: "2px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                    Valor Total Pagado
                  </span>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b", fontStyle: "italic" }}>
                    Moneda Legal Colombiana (COP)
                  </p>
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f2744" }}>
                  {formatCOP(selectedReceipt.amount)}
                </div>
              </div>

              {/* Firma y Sello */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginTop: "36px", paddingTop: "20px", borderTop: "1px dashed #cbd5e1" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: "40px", borderBottom: "1px solid #94a3b8", marginBottom: "6px" }}></div>
                  <strong style={{ fontSize: "0.75rem", color: "#0f2744", display: "block" }}>
                    Dra. Carolina Jiménez Ariza
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Socia Directora · J&A Legal</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ height: "40px", borderBottom: "1px solid #94a3b8", marginBottom: "6px" }}></div>
                  <strong style={{ fontSize: "0.75rem", color: "#0f2744", display: "block" }}>
                    Firma del Cliente / Beneficiario
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>C.C. de aceptación y radicación</span>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                style={{
                  background: "#e2e8f0",
                  color: "#334155",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  background: "#b38234",
                  color: "#ffffff",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                }}
              >
                🖨️ Imprimir / Guardar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
