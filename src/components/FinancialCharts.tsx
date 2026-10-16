import React, { useState } from "react";
import { FinancialRecord } from "../types/portal";

interface FinancialChartsProps {
  finances: FinancialRecord[];
}

function formatCOP(val: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);
}

export function FinancialCharts({ finances }: FinancialChartsProps) {
  const [activeTab, setActiveTab] = useState<"general" | "socios" | "estados">("general");

  // Cálculos principales
  const totalPactado = finances.reduce((acc, f) => acc + (f.total_pactado ?? f.amount ?? 0), 0);
  const totalRecaudado = finances.reduce((acc, f) => acc + (f.abono_recibido ?? (f.status === "completado" ? f.amount : 0)), 0);
  const totalSaldoPendiente = finances.reduce((acc, f) => acc + (f.saldo_pendiente ?? Math.max(0, (f.total_pactado ?? f.amount) - (f.abono_recibido ?? 0))), 0);
  
  const totalMarlon = finances.reduce((acc, f) => acc + (f.marlon_recibe ?? ((f.abono_recibido ?? 0) * (f.pct_marlon ?? 50)) / 100), 0);
  const totalSebastian = finances.reduce((acc, f) => acc + (f.sebastian_recibe ?? ((f.abono_recibido ?? 0) * (f.pct_sebastian ?? 50)) / 100), 0);

  const pctRecaudado = totalPactado > 0 ? Math.round((totalRecaudado / totalPactado) * 100) : 0;
  const pctMarlonTotal = totalRecaudado > 0 ? Math.round((totalMarlon / totalRecaudado) * 100) : 56;
  const pctSebastianTotal = totalRecaudado > 0 ? Math.round((totalSebastian / totalRecaudado) * 100) : 44;

  const countPagados = finances.filter((f) => (f.payment_status === "Pagado" || f.saldo_pendiente === 0)).length;
  const countParciales = finances.filter((f) => f.payment_status === "Abono parcial" || (f.abono_recibido && f.abono_recibido > 0 && (f.saldo_pendiente ?? 0) > 0)).length;
  const countPendientes = finances.filter((f) => f.payment_status === "Pendiente" || (f.abono_recibido === 0 && (f.saldo_pendiente ?? 0) > 0)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* KPI Cards Superiores */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
        }}
      >
        {/* Total Pactado */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
            border: "1px solid rgba(217, 181, 106, 0.3)",
            borderRadius: "8px",
            padding: "16px 18px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
            Total Pactado en Honorarios
          </span>
          <p style={{ margin: "6px 0 2px", fontSize: "1.45rem", fontWeight: 800, color: "var(--text-bright)" }}>
            {formatCOP(totalPactado)}
          </p>
          <small style={{ fontSize: "0.74rem", color: "var(--brass-light)" }}>
            En {finances.length} casos registrados en firma
          </small>
        </div>

        {/* Total Recaudado */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(20, 83, 45, 0.35) 0%, rgba(15, 23, 42, 0.85) 100%)",
            border: "1px solid rgba(74, 222, 128, 0.4)",
            borderRadius: "8px",
            padding: "16px 18px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#86efac", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Abonos Recibidos (Efectivo)
            </span>
            <span style={{ fontSize: "0.72rem", background: "rgba(74, 222, 128, 0.2)", color: "#4ade80", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
              {pctRecaudado}%
            </span>
          </div>
          <p style={{ margin: "6px 0 2px", fontSize: "1.45rem", fontWeight: 800, color: "#4ade80" }}>
            {formatCOP(totalRecaudado)}
          </p>
          <small style={{ fontSize: "0.74rem", color: "#bbf7d0" }}>
            Fondos disponibles y liquidados
          </small>
        </div>

        {/* Saldo Pendiente por Cobrar */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(127, 29, 29, 0.35) 0%, rgba(15, 23, 42, 0.85) 100%)",
            border: "1px solid rgba(248, 113, 113, 0.4)",
            borderRadius: "8px",
            padding: "16px 18px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#fca5a5", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Saldo Pendiente de Cobro
            </span>
            <span style={{ fontSize: "0.72rem", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>
              {100 - pctRecaudado}%
            </span>
          </div>
          <p style={{ margin: "6px 0 2px", fontSize: "1.45rem", fontWeight: 800, color: "#f87171" }}>
            {formatCOP(totalSaldoPendiente)}
          </p>
          <small style={{ fontSize: "0.74rem", color: "#fecaca" }}>
            Cartera por recaudar en diligencias
          </small>
        </div>

        {/* Reparto Socios */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(30, 58, 138, 0.35) 0%, rgba(15, 23, 42, 0.85) 100%)",
            border: "1px solid rgba(96, 165, 250, 0.4)",
            borderRadius: "8px",
            padding: "16px 18px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "#93c5fd", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
            Reparto entre Socios Titulares
          </span>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <div>
              <small style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>Dr. Marlon ({pctMarlonTotal}%)</small>
              <strong style={{ color: "#60a5fa", fontSize: "0.98rem" }}>{formatCOP(totalMarlon)}</strong>
            </div>
            <div style={{ textAlign: "right" }}>
              <small style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>Dr. Sebastián ({pctSebastianTotal}%)</small>
              <strong style={{ color: "#c084fc", fontSize: "0.98rem" }}>{formatCOP(totalSebastian)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de sub-vistas de gráficas */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          style={{
            padding: "8px 16px",
            fontSize: "0.82rem",
            fontWeight: 700,
            borderRadius: "6px",
            border: activeTab === "general" ? "1px solid var(--brass)" : "1px solid transparent",
            background: activeTab === "general" ? "rgba(217, 181, 106, 0.15)" : "transparent",
            color: activeTab === "general" ? "var(--brass-light)" : "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          📊 Comparativa Casos (Pactado vs Recaudado vs Saldo)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("socios")}
          style={{
            padding: "8px 16px",
            fontSize: "0.82rem",
            fontWeight: 700,
            borderRadius: "6px",
            border: activeTab === "socios" ? "1px solid var(--brass)" : "1px solid transparent",
            background: activeTab === "socios" ? "rgba(217, 181, 106, 0.15)" : "transparent",
            color: activeTab === "socios" ? "var(--brass-light)" : "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          👥 Distribución de Honorarios Socios (% y $)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("estados")}
          style={{
            padding: "8px 16px",
            fontSize: "0.82rem",
            fontWeight: 700,
            borderRadius: "6px",
            border: activeTab === "estados" ? "1px solid var(--brass)" : "1px solid transparent",
            background: activeTab === "estados" ? "rgba(217, 181, 106, 0.15)" : "transparent",
            color: activeTab === "estados" ? "var(--brass-light)" : "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          📈 Estado de Pagos & Cartera
        </button>
      </div>

      {/* CONTENIDO 1: Gráfica comparativa de barras por caso */}
      {activeTab === "general" && (
        <div
          style={{
            background: "var(--parchment-deep)",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-bright)" }}>
                Rendimiento Económico Caso por Caso
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Comparativa visual de valores pactados, abonos recaudados y saldo pendiente en cobranza
              </p>
            </div>
            {/* Leyenda */}
            <div style={{ display: "flex", gap: "16px", fontSize: "0.78rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#38bdf8" }} />
                <span style={{ color: "var(--text-muted)" }}>Pactado</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#4ade80" }} />
                <span style={{ color: "var(--text-muted)" }}>Abono Recibido</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "2px", background: "#f87171" }} />
                <span style={{ color: "var(--text-muted)" }}>Saldo Pendiente</span>
              </div>
            </div>
          </div>

          {/* Barras Horizontales por Caso */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {finances.map((item) => {
              const pactado = item.total_pactado ?? item.amount ?? 0;
              const abono = item.abono_recibido ?? (item.status === "completado" ? item.amount : 0);
              const saldo = item.saldo_pendiente ?? Math.max(0, pactado - abono);
              const maxScale = Math.max(...finances.map((f) => f.total_pactado ?? f.amount ?? 1), 2000000);
              
              const pctPactado = Math.min(100, Math.round((pactado / maxScale) * 100));
              const pctAbono = Math.min(100, Math.round((abono / maxScale) * 100));
              const pctSaldo = Math.min(100, Math.round((saldo / maxScale) * 100));

              return (
                <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                    <span style={{ fontWeight: 700, color: "var(--text-bright)" }}>
                      {item.case_name || item.concept}
                      <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: "8px" }}>
                        ({item.client_name})
                      </span>
                    </span>
                    <span style={{ fontSize: "0.78rem", color: saldo > 0 ? "#f87171" : "#4ade80", fontWeight: 700 }}>
                      {saldo > 0 ? `Saldo: ${formatCOP(saldo)}` : "100% Pagado"}
                    </span>
                  </div>

                  {/* Barra múltiple */}
                  <div
                    style={{
                      height: "22px",
                      background: "rgba(15, 23, 42, 0.6)",
                      borderRadius: "4px",
                      position: "relative",
                      display: "flex",
                      overflow: "hidden",
                      border: "1px solid var(--line)",
                    }}
                  >
                    {/* Barra de Abono */}
                    <div
                      style={{
                        width: `${pctAbono}%`,
                        background: "linear-gradient(90deg, #16a34a 0%, #4ade80 100%)",
                        height: "100%",
                        transition: "width 0.4s ease",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: "6px",
                      }}
                      title={`Abono recibido: ${formatCOP(abono)}`}
                    >
                      {pctAbono > 15 && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#052e16", whiteSpace: "nowrap" }}>
                          {formatCOP(abono)}
                        </span>
                      )}
                    </div>

                    {/* Barra de Saldo Pendiente */}
                    {saldo > 0 && (
                      <div
                        style={{
                          width: `${pctSaldo}%`,
                          background: "linear-gradient(90deg, #dc2626 0%, #f87171 100%)",
                          height: "100%",
                          transition: "width 0.4s ease",
                          display: "flex",
                          alignItems: "center",
                          paddingLeft: "6px",
                        }}
                        title={`Saldo pendiente: ${formatCOP(saldo)}`}
                      >
                        {pctSaldo > 15 && (
                          <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#450a0a", whiteSpace: "nowrap" }}>
                            {formatCOP(saldo)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <span>Pactado: {formatCOP(pactado)} · Pago: {item.forma_cobro || item.payment_method}</span>
                    <span>Fecha último abono: {item.fecha_ultimo_abono || item.date || "Pendiente"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CONTENIDO 2: Distribución de Socios */}
      {activeTab === "socios" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            background: "var(--parchment-deep)",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          {/* Tarjeta Dr. Marlon */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#032b43",
                  fontSize: "1.1rem",
                }}
              >
                MJ
              </div>
              <div>
                <h4 style={{ margin: 0, color: "var(--text-bright)", fontSize: "1rem" }}>Dr. Marlon Jiménez</h4>
                <small style={{ color: "#38bdf8", fontSize: "0.75rem" }}>Socio Administrador · Litigio & Contratos</small>
              </div>
            </div>

            <div style={{ background: "rgba(2, 132, 199, 0.1)", borderRadius: "6px", padding: "14px", marginBottom: "14px" }}>
              <span style={{ fontSize: "0.72rem", color: "#7dd3fc" }}>HONORARIOS PERCIBIDOS (EFECTIVO)</span>
              <p style={{ margin: "4px 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#38bdf8" }}>
                {formatCOP(totalMarlon)}
              </p>
              <small style={{ color: "#bae6fd", fontSize: "0.75rem" }}>
                {pctMarlonTotal}% del total recaudado en bufete
              </small>
            </div>

            <h5 style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--text-bright)" }}>Desglose por caso:</h5>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem" }}>
              {finances.map((f) => {
                const rec = f.marlon_recibe ?? ((f.abono_recibido ?? 0) * (f.pct_marlon ?? 50)) / 100;
                return (
                  <div key={f.id} style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.case_name || f.concept} ({f.pct_marlon ?? 50}%)
                    </span>
                    <strong style={{ color: rec > 0 ? "#38bdf8" : "var(--text-muted)" }}>{formatCOP(rec)}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tarjeta Dr. Sebastián */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(192, 132, 252, 0.3)",
              borderRadius: "8px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #9333ea 0%, #c084fc 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  color: "#2e1065",
                  fontSize: "1.1rem",
                }}
              >
                SA
              </div>
              <div>
                <h4 style={{ margin: 0, color: "var(--text-bright)", fontSize: "1rem" }}>Dr. Felipe Sebastián Ariza Gómez</h4>
                <small style={{ color: "#c084fc", fontSize: "0.75rem" }}>Socio Administrador · Familia & Inmobiliario</small>
              </div>
            </div>

            <div style={{ background: "rgba(147, 51, 234, 0.1)", borderRadius: "6px", padding: "14px", marginBottom: "14px" }}>
              <span style={{ fontSize: "0.72rem", color: "#e9d5ff" }}>HONORARIOS PERCIBIDOS (EFECTIVO)</span>
              <p style={{ margin: "4px 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#c084fc" }}>
                {formatCOP(totalSebastian)}
              </p>
              <small style={{ color: "#f3e8ff", fontSize: "0.75rem" }}>
                {pctSebastianTotal}% del total recaudado en bufete
              </small>
            </div>

            <h5 style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--text-bright)" }}>Desglose por caso:</h5>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.75rem" }}>
              {finances.map((f) => {
                const rec = f.sebastian_recibe ?? ((f.abono_recibido ?? 0) * (f.pct_sebastian ?? 50)) / 100;
                return (
                  <div key={f.id} style={{ display: "flex", justifyContent: "space-between", color: "var(--text-muted)" }}>
                    <span style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.case_name || f.concept} ({f.pct_sebastian ?? 50}%)
                    </span>
                    <strong style={{ color: rec > 0 ? "#c084fc" : "var(--text-muted)" }}>{formatCOP(rec)}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO 3: Estados de Pago */}
      {activeTab === "estados" && (
        <div
          style={{
            background: "var(--parchment-deep)",
            border: "1px solid var(--line)",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", color: "var(--text-bright)" }}>
            Estado de Cartera & Recaudación de la Firma
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid #22c55e", padding: "16px", borderRadius: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#86efac", fontWeight: 700 }}>CASOS PAGADOS (100%)</span>
              <p style={{ margin: "6px 0 0", fontSize: "1.6rem", fontWeight: 800, color: "#4ade80" }}>
                {countPagados} casos
              </p>
              <small style={{ color: "#bbf7d0", fontSize: "0.72rem" }}>Sin saldo pendiente</small>
            </div>

            <div style={{ background: "rgba(234, 179, 8, 0.1)", border: "1px solid #eab308", padding: "16px", borderRadius: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#fde047", fontWeight: 700 }}>ABONO PARCIAL</span>
              <p style={{ margin: "6px 0 0", fontSize: "1.6rem", fontWeight: 800, color: "#facc15" }}>
                {countParciales} caso(s)
              </p>
              <small style={{ color: "#fef08a", fontSize: "0.72rem" }}>Abono recibido + saldo pendiente</small>
            </div>

            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", padding: "16px", borderRadius: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "#fca5a5", fontWeight: 700 }}>PENDIENTE TOTAL</span>
              <p style={{ margin: "6px 0 0", fontSize: "1.6rem", fontWeight: 800, color: "#f87171" }}>
                {countPendientes} caso(s)
              </p>
              <small style={{ color: "#fecaca", fontSize: "0.72rem" }}>A la espera del primer pago</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
