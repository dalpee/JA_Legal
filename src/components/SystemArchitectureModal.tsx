import { useState } from "react";
import { Scale, FileText, CheckCircle2 } from "./icons";

interface SystemArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemArchitectureModal({ isOpen, onClose }: SystemArchitectureModalProps) {
  const [activeTab, setActiveTab] = useState<"arch" | "db" | "audit">("arch");

  if (!isOpen) return null;

  const auditLogs = [
    { id: "log_01", timestamp: "2026-10-04 19:15:20 UTC", event: "AUTH_SIGNIN_SUCCESS", user: "abogado@jalegal.com.co", role: "firm", ip: "190.158.42.112", hash: "8f7e2b1a9c4d3e..." },
    { id: "log_02", timestamp: "2026-10-04 19:16:33 UTC", event: "DB_INSERT_RECORD", table: "financial_records", user: "Dra. Carolina Jiménez", ip: "190.158.42.112", hash: "4a1d8f9c0e2b5a..." },
    { id: "log_03", timestamp: "2026-10-04 19:20:10 UTC", event: "CASE_STATUS_UPDATE", table: "cases", record_id: "case_001", ip: "186.28.199.45", hash: "6b3f9d1e2c8a70..." },
    { id: "log_04", timestamp: "2026-10-04 19:22:45 UTC", event: "DOCUMENT_INTEGRITY_CHECK", doc: "Poder_General_Autenticado.pdf", status: "VERIFIED_VALID", hash: "99e1a3b5c7d8f0..." },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          background: "#0c1527",
          border: "1px solid var(--brass)",
          borderRadius: "8px",
          maxWidth: "850px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
          color: "var(--text-bright)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid var(--line)" }}>
          <div>
            <span style={{ fontSize: "0.72rem", color: "var(--brass)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Facultad de Ingeniería de Sistemas · Documentación de Software
            </span>
            <h3 style={{ margin: "2px 0 0", fontSize: "1.25rem", color: "var(--brass-glow)", fontFamily: "var(--font-heading)" }}>
              Arquitectura de Software, Seguridad & Auditoría
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.3rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--line)", background: "rgba(0,0,0,0.2)" }}>
          <button
            type="button"
            onClick={() => setActiveTab("arch")}
            style={{
              padding: "12px 20px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "arch" ? "2px solid var(--brass)" : "2px solid transparent",
              color: activeTab === "arch" ? "var(--brass-glow)" : "var(--text-muted)",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            📐 Arquitectura & Stack Tecnológico
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("db")}
            style={{
              padding: "12px 20px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "db" ? "2px solid var(--brass)" : "2px solid transparent",
              color: activeTab === "db" ? "var(--brass-glow)" : "var(--text-muted)",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            🗄️ Modelo Relacional E-R (Supabase)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            style={{
              padding: "12px 20px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "audit" ? "2px solid var(--brass)" : "2px solid transparent",
              color: activeTab === "audit" ? "var(--brass-glow)" : "var(--text-muted)",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            🛡️ Bitácora de Auditoría (Audit Trail)
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", overflowY: "auto", fontSize: "0.85rem", lineHeight: 1.6 }}>
          {activeTab === "arch" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
                  <h4 style={{ margin: "0 0 8px", color: "var(--brass)" }}>Frontend & Capa de Presentación</h4>
                  <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    <li><strong>React 19 + TypeScript:</strong> Tipado estricto en entidades jurídicas.</li>
                    <li><strong>Vite 8:</strong> Compilación optimizada en menos de 700ms.</li>
                    <li><strong>SPA State Management:</strong> Estado reactivo con persistencia local y sincronización remota.</li>
                    <li><strong>Diseño Editorial Legal:</strong> Paleta parchment, navy e ink respetando normas de accesibilidad.</li>
                  </ul>
                </div>

                <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
                  <h4 style={{ margin: "0 0 8px", color: "#38bdf8" }}>Backend & Capa de Persistencia</h4>
                  <ul style={{ margin: 0, paddingLeft: "18px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    <li><strong>Supabase PostgreSQL:</strong> Base de datos relacional serverless.</li>
                    <li><strong>Row Level Security (RLS):</strong> Políticas que garantizan secreto profesional entre clientes.</li>
                    <li><strong>Auth JWT:</strong> Tokens Bearer con expiración y roles asignados en metadata.</li>
                    <li><strong>Hashing SHA-256:</strong> Certificación de no alteración de documentos (Ley 527 de 1999).</li>
                  </ul>
                </div>
              </div>

              <div style={{ background: "rgba(217, 181, 106, 0.08)", border: "1px solid var(--brass)", padding: "14px", borderRadius: "6px" }}>
                <strong style={{ color: "var(--brass-glow)", display: "block", marginBottom: "4px" }}>
                  💡 Patrón de Diseño Implementado:
                </strong>
                <p style={{ margin: 0, color: "var(--text-bright)", fontSize: "0.8rem" }}>
                  Se emplea una arquitectura modular desacoplada con <strong>Separación de Responsabilidades (SoC)</strong>, componentes puros sin acoplamiento a servicios externos directos, y un cliente abstracto en <code>src/lib/supabaseClient.ts</code> que permite operar en modo autónomo local o enlazado a la nube.
                </p>
              </div>
            </div>
          )}

          {activeTab === "db" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <p style={{ margin: 0, color: "var(--text-muted)" }}>
                Esquema normalizado en <strong>Tercera Forma Normal (3FN)</strong> para procesos jurídicos y economía:
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "var(--ink-soft)", padding: "12px", borderRadius: "4px", border: "1px solid var(--line)" }}>
                  <strong style={{ color: "#4ade80" }}>Tabla: profiles</strong>
                  <pre style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
{`id (UUID, PK) references auth.users
full_name (VARCHAR, NOT NULL)
role (ENUM: 'client', 'firm')
id_number (VARCHAR)
phone (VARCHAR)`}
                  </pre>
                </div>

                <div style={{ background: "var(--ink-soft)", padding: "12px", borderRadius: "4px", border: "1px solid var(--line)" }}>
                  <strong style={{ color: "var(--brass)" }}>Tabla: cases</strong>
                  <pre style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
{`id (TEXT, PK)
client_id (UUID, FK -> profiles.id)
process_type (VARCHAR)
progress (INTEGER 0-100)
total_fees (NUMERIC COP)
balance (NUMERIC COP)`}
                  </pre>
                </div>

                <div style={{ background: "var(--ink-soft)", padding: "12px", borderRadius: "4px", border: "1px solid var(--line)" }}>
                  <strong style={{ color: "#38bdf8" }}>Tabla: financial_records</strong>
                  <pre style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
{`id (TEXT, PK)
case_id (TEXT, FK -> cases.id)
type ('ingreso' | 'egreso')
amount (NUMERIC, NOT NULL)
receipt_number (VARCHAR, UNIQUE)`}
                  </pre>
                </div>

                <div style={{ background: "var(--ink-soft)", padding: "12px", borderRadius: "4px", border: "1px solid var(--line)" }}>
                  <strong style={{ color: "#f472b6" }}>Tabla: agenda_items & documents</strong>
                  <pre style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
{`id (TEXT, PK)
case_id (TEXT, FK -> cases.id)
event_date (TIMESTAMP)
file_sha256 (VARCHAR, integridad)`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div>
              <p style={{ margin: "0 0 12px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                Registro inmutable de trazabilidad conforme al principio de no repudio de la Ley 527 de 1999:
              </p>

              <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: "4px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.3)", color: "var(--text-muted)", borderBottom: "1px solid var(--line)" }}>
                      <th style={{ padding: "8px 10px" }}>Timestamp UTC</th>
                      <th style={{ padding: "8px 10px" }}>Evento</th>
                      <th style={{ padding: "8px 10px" }}>Usuario / Sujeto</th>
                      <th style={{ padding: "8px 10px" }}>IP Origen</th>
                      <th style={{ padding: "8px 10px" }}>Hash SHA-256</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{log.timestamp}</td>
                        <td style={{ padding: "8px 10px", color: "var(--brass-light)", fontWeight: 600 }}>{log.event}</td>
                        <td style={{ padding: "8px 10px" }}>{log.user || log.table || log.doc}</td>
                        <td style={{ padding: "8px 10px", color: "var(--text-muted)" }}>{log.ip || "127.0.0.1"}</td>
                        <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#4ade80" }}>{log.hash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "14px 24px", borderTop: "1px solid var(--line)", background: "rgba(0,0,0,0.2)" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px",
              background: "var(--brass)",
              color: "var(--ink)",
              border: "none",
              borderRadius: "4px",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Cerrar Especificación
          </button>
        </div>
      </div>
    </div>
  );
}
