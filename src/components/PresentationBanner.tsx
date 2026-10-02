import React from "react";
import { Sliders, Sparkles, Printer, UserCheck, ShieldCheck } from "./icons";
import { caseTemplates } from "../data/initialData";

interface PresentationBannerProps {
  onOpenEditor: () => void;
  onLoadTemplate: (tplId: string) => void;
  onPrintReport: () => void;
  isPresentationMode: boolean;
  onTogglePresentationMode: () => void;
  userRole: "client" | "firm";
  onToggleRole: () => void;
  currentTemplateId?: string;
}

export function PresentationBanner({
  onOpenEditor,
  onLoadTemplate,
  onPrintReport,
  isPresentationMode,
  onTogglePresentationMode,
  userRole,
  onToggleRole,
}: PresentationBannerProps) {
  if (isPresentationMode) {
    return (
      <div
        className="print:hidden"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 90,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "var(--ink-panel)",
          border: "1px solid var(--brass)",
          padding: "8px 14px",
          borderRadius: "4px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
        }}
      >
        <span style={{ fontSize: "0.8rem", color: "var(--brass-light)", fontWeight: 500 }}>
          Modo Presentación Activo
        </span>
        <button
          type="button"
          onClick={onOpenEditor}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--ink)",
            background: "var(--brass)",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          <Sliders size={14} />
          <span>Modificar Caso</span>
        </button>
        <button
          type="button"
          onClick={onTogglePresentationMode}
          style={{
            padding: "6px 10px",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            background: "transparent",
            border: "1px solid var(--line)",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Barra de simulación para clientes"
      className="simulator-banner print:hidden"
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span className="simulator-tag">
          <Sparkles size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "4px" }} />
          Simulador para Clientes
        </span>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Demuestre el avance de su página al cliente y modifique las variables del caso en vivo.
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Templates */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Ejemplos:</span>
          {caseTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onLoadTemplate(tpl.id)}
              style={{
                padding: "3px 8px",
                fontSize: "0.72rem",
                borderRadius: "3px",
                background: "var(--parchment-deep)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              {tpl.area}
            </button>
          ))}
        </div>

        {/* Toggle role */}
        <button
          type="button"
          onClick={onToggleRole}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            fontSize: "0.75rem",
            borderRadius: "3px",
            background: "var(--ink-panel)",
            border: "1px solid var(--line)",
            color: "var(--text-bright)",
            cursor: "pointer",
          }}
          title="Alternar vista entre Cliente y Firma"
        >
          {userRole === "client" ? (
            <>
              <UserCheck size={14} color="#7fae8f" />
              <span>Vista: Cliente</span>
            </>
          ) : (
            <>
              <ShieldCheck size={14} color="#d9b56a" />
              <span>Vista: Firma</span>
            </>
          )}
        </button>

        {/* Print */}
        <button
          type="button"
          onClick={onPrintReport}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 10px",
            fontSize: "0.75rem",
            borderRadius: "3px",
            background: "var(--ink-panel)",
            border: "1px solid var(--line)",
            color: "var(--text-bright)",
            cursor: "pointer",
          }}
          title="Imprimir resumen oficial para el cliente"
        >
          <Printer size={14} color="#d9b56a" />
          <span>Ficha</span>
        </button>

        {/* Modify Case Button */}
        <button
          type="button"
          onClick={onOpenEditor}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 14px",
            fontSize: "0.78rem",
            fontWeight: 600,
            background: "var(--brass)",
            color: "var(--ink)",
            border: "none",
            borderRadius: "3px",
            cursor: "pointer",
          }}
        >
          <Sliders size={14} />
          <span>Modificar Caso</span>
        </button>
      </div>
    </aside>
  );
}
