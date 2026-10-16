import { useState, useId } from "react";
import { Scale, CheckCircle2, FileText, ArrowRight } from "./icons";

interface LegalCalculatorProps {
  onClose?: () => void;
  onApplyToCase?: (liquidationSummary: string, totalAmount: number) => void;
}

function formatCOP(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);
}

export function LegalCalculator({ onClose, onApplyToCase }: LegalCalculatorProps) {
  const [capital, setCapital] = useState<string>("15000000");
  const [startDate, setStartDate] = useState<string>("2026-01-15");
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [rateType, setRateType] = useState<"comercial" | "civil" | "usura">("comercial");
  const [includeIpc, setIncludeIpc] = useState(true);

  // Tasas legales colombianas vigentes certificadas
  const annualRates = {
    comercial: 0.275, // 27.50% E.A. (Bancaria Corriente Moratoria)
    civil: 0.06,      // 6.00% anual (Art. 1617 Código Civil)
    usura: 0.312,     // 31.20% E.A. (Límite de usura certificado Superfinanciera)
  };

  const ipcAnnualRate = 0.058; // 5.80% IPC proyectado DANE

  const capitalNum = parseFloat(capital.replace(/\D/g, "")) || 0;

  // Cálculo de días
  const dStart = new Date(`${startDate}T00:00:00`);
  const dEnd = new Date(`${endDate}T00:00:00`);
  const diffTime = Math.max(0, dEnd.getTime() - dStart.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Tasa diaria equivalente
  const activeRate = annualRates[rateType];
  const dailyRate = Math.pow(1 + activeRate, 1 / 365) - 1;
  const interestAmount = capitalNum * dailyRate * diffDays;

  // Indexación monetaria IPC (Pérdida de poder adquisitivo del dinero)
  const ipcAmount = includeIpc ? capitalNum * (ipcAnnualRate / 365) * diffDays : 0;

  const grandTotal = capitalNum + interestAmount + ipcAmount;

  return (
    <div
      style={{
        background: "var(--parchment-deep)",
        border: "1px solid var(--brass)",
        borderRadius: "6px",
        padding: "24px",
        color: "var(--text-bright)",
        maxWidth: "850px",
        margin: "0 auto",
        boxShadow: "0 15px 35px rgba(0,0,0,0.4)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", borderBottom: "1px solid var(--line)", paddingBottom: "16px" }}>
        <div>
          <span style={{ fontSize: "0.72rem", color: "var(--brass)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Módulo LegalTech · Ingeniería Aplicada
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: "1.35rem", color: "var(--brass-glow)", fontFamily: "var(--font-heading)" }}>
            Liquidador Judicial & Calculadora de Intereses Moratorios
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Normativa colombiana: Art. 884 Código de Comercio · Art. 1617 Código Civil · Certificación Superfinanciera
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.3rem", cursor: "pointer" }}
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
        {/* Parámetros de Entrada */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Capital o Cuantía en Mora ($ COP) *
            </label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="Ej: 15000000"
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "var(--ink-soft)",
                border: "1px solid var(--line)",
                color: "#fff",
                borderRadius: "4px",
                fontSize: "0.95rem",
                fontWeight: 600,
              }}
            />
            <small style={{ color: "var(--brass-light)", fontSize: "0.72rem" }}>
              Equivale a: {formatCOP(capitalNum)}
            </small>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Fecha Inicial de Exigibilidad
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: "100%", padding: "8px", background: "var(--ink-soft)", border: "1px solid var(--line)", color: "#fff", borderRadius: "4px", fontSize: "0.82rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Fecha de Corte de Liquidación
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: "100%", padding: "8px", background: "var(--ink-soft)", border: "1px solid var(--line)", color: "#fff", borderRadius: "4px", fontSize: "0.82rem" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Régimen Jurídico & Tasa Aplicable
            </label>
            <select
              value={rateType}
              onChange={(e) => setRateType(e.target.value as any)}
              style={{ width: "100%", padding: "10px", background: "var(--ink-soft)", border: "1px solid var(--line)", color: "#fff", borderRadius: "4px", fontSize: "0.85rem" }}
            >
              <option value="comercial">Comercial / Bancario Superfinanciera (27.50% E.A.)</option>
              <option value="civil">Interés Legal Civil Art. 1617 C.C. (6.00% anual)</option>
              <option value="usura">Tasa Máxima de Usura Legal (31.20% E.A.)</option>
            </select>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--text-bright)", cursor: "pointer", marginTop: "4px" }}>
            <input
              type="checkbox"
              checked={includeIpc}
              onChange={(e) => setIncludeIpc(e.target.checked)}
              style={{ accentColor: "var(--brass)", width: "16px", height: "16px" }}
            />
            <span>Incluir Indexación / Corrección Monetaria IPC (DANE)</span>
          </label>
        </div>

        {/* Resumen de Liquidación y Resultados */}
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            border: "1px solid var(--line)",
            borderRadius: "6px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 600 }}>
              Cuadro Discriminado de Liquidación
            </span>

            <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Días en Mora:</span>
                <strong style={{ color: "var(--brass)" }}>{diffDays} días</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Capital Principal:</span>
                <strong style={{ color: "var(--text-bright)" }}>{formatCOP(capitalNum)}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>Intereses Moratorios:</span>
                <strong style={{ color: "#4ade80" }}>+ {formatCOP(interestAmount)}</strong>
              </div>

              {includeIpc && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Indexación IPC:</span>
                  <strong style={{ color: "#38bdf8" }}>+ {formatCOP(ipcAmount)}</strong>
                </div>
              )}
            </div>

            {/* Total Destacado */}
            <div
              style={{
                marginTop: "18px",
                background: "rgba(217, 181, 106, 0.12)",
                border: "1px solid var(--brass)",
                borderRadius: "4px",
                padding: "14px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", color: "var(--brass-light)", fontWeight: 700 }}>
                Total a Pretender en Demanda
              </span>
              <p style={{ margin: "4px 0 0", fontSize: "1.5rem", fontWeight: 800, color: "var(--brass-glow)", fontFamily: "var(--font-heading)" }}>
                {formatCOP(grandTotal)}
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                flex: 1,
                padding: "8px",
                background: "transparent",
                border: "1px solid var(--line)",
                color: "var(--text-bright)",
                borderRadius: "4px",
                fontSize: "0.75rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              🖨️ Imprimir Liquidación
            </button>
            {onApplyToCase && (
              <button
                type="button"
                onClick={() => {
                  const summary = `Liquidación prejudicial: Capital ${formatCOP(capitalNum)} + Intereses moratorios ${formatCOP(interestAmount)} (${diffDays} días de mora) + Indexación ${formatCOP(ipcAmount)}. Total a cobrar: ${formatCOP(grandTotal)}`;
                  onApplyToCase(summary, grandTotal);
                  alert("¡Liquidación incorporada satisfactoriamente a la memoria procesal del caso!");
                }}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "var(--brass)",
                  color: "var(--ink)",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                + Adjuntar a Caso
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
