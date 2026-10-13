import { useState, useEffect, FormEvent } from "react";
import { CaseRecord, CasePhase } from "../types/portal";

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveCase: (newCase: CaseRecord) => void;
  existingCase?: CaseRecord | null;
  registeredUsers?: { id: string; email: string; full_name: string; role?: string; id_number?: string }[];
  prefilledClientId?: string;
  prefilledClientEmail?: string;
  prefilledClientName?: string;
}

export function CreateCaseModal({
  isOpen,
  onClose,
  onSaveCase,
  existingCase,
  registeredUsers = [],
  prefilledClientId = "",
  prefilledClientEmail = "",
  prefilledClientName = "",
}: CreateCaseModalProps) {
  const [title, setTitle] = useState(existingCase?.title || "");
  const [radicado, setRadicado] = useState(existingCase?.filed_date || existingCase?.radicado || "");
  const [processType, setProcessType] = useState(existingCase?.process_type || "Proceso Civil Ordinario");
  const [clientId, setClientId] = useState(existingCase?.client_id || prefilledClientId || "");
  const [clientEmail, setClientEmail] = useState(existingCase?.client_email || prefilledClientEmail || "");
  const [clientName, setClientName] = useState(existingCase?.client_name || prefilledClientName || "");
  const [authority, setAuthority] = useState(existingCase?.authority || "Juzgado Civil Municipal de Bogotá D.C.");
  const [lawyer, setLawyer] = useState(existingCase?.lawyer || "Dr. Marlon Jiménez - Socio Director");
  const [progress, setProgress] = useState<number>(existingCase?.progress ?? 15);
  const [status, setStatus] = useState(existingCase?.status || "Demanda Radicada / En Trámite");
  const [totalFees, setTotalFees] = useState<string>(existingCase?.total_fees ? String(existingCase.total_fees) : "6000000");
  const [balance, setBalance] = useState<string>(existingCase?.balance ? String(existingCase.balance) : "4000000");
  const [counterparty, setCounterparty] = useState(existingCase?.counterparty || "");
  const [observations, setObservations] = useState(existingCase?.observations || "");

  useEffect(() => {
    if (isOpen) {
      setTitle(existingCase?.title || "");
      setRadicado(existingCase?.filed_date || existingCase?.radicado || "");
      setProcessType(existingCase?.process_type || "Proceso Civil Ordinario");
      setClientId(existingCase?.client_id || prefilledClientId || "");
      setClientEmail(existingCase?.client_email || prefilledClientEmail || "");
      setClientName(existingCase?.client_name || prefilledClientName || "");
      setAuthority(existingCase?.authority || "Juzgado Civil Municipal de Bogotá D.C.");
      setLawyer(existingCase?.lawyer || "Dr. Marlon Jiménez - Socio Director");
      setProgress(existingCase?.progress ?? 15);
      setStatus(existingCase?.status || "Demanda Radicada / En Trámite");
      setTotalFees(existingCase?.total_fees ? String(existingCase.total_fees) : "6000000");
      setBalance(existingCase?.balance ? String(existingCase.balance) : "4000000");
      setCounterparty(existingCase?.counterparty || "");
      setObservations(existingCase?.observations || "");
    }
  }, [isOpen, existingCase, prefilledClientId, prefilledClientEmail, prefilledClientName]);

  if (!isOpen) return null;

  const handleSelectPredefinedUser = (userId: string) => {
    const user = registeredUsers.find((u) => u.id === userId);
    if (user) {
      setClientId(user.id);
      setClientEmail(user.email);
      setClientName(user.full_name);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || (!clientEmail.trim() && !clientId.trim())) {
      alert("Por favor ingrese el título del proceso y asigne el cliente o su ID de usuario.");
      return;
    }

    const defaultPhases: CasePhase[] = existingCase?.phases || [
      {
        id: "ph_1",
        name: "1. Radicación de Demanda & Admisión",
        description: "Presentación formal, reparto judicial y emisión de auto admisorio.",
        status: progress >= 25 ? "completed" : "in_progress",
      },
      {
        id: "ph_2",
        name: "2. Notificaciones & Medidas Cautelares",
        description: "Emplazamiento a la contraparte y decreto de medidas de embargo o secuestro.",
        status: progress >= 50 ? "completed" : progress >= 25 ? "in_progress" : "pending",
      },
      {
        id: "ph_3",
        name: "3. Práctica de Pruebas & Audiencia Inicial",
        description: "Decreto y recepción de testimonios, peritajes y fijación del litigio (Art. 372 CGP).",
        status: progress >= 75 ? "completed" : progress >= 50 ? "in_progress" : "pending",
      },
      {
        id: "ph_4",
        name: "4. Audiencia de Instrucción & Sentencia",
        description: "Alegatos de conclusión y emisión del fallo definitivo favorable.",
        status: progress === 100 ? "completed" : progress >= 75 ? "in_progress" : "pending",
      },
    ];

    const updatedCase: CaseRecord = {
      id: existingCase?.id || `case_${Date.now()}`,
      client_id: clientId.trim() || existingCase?.client_id || `usr_cli_${Date.now()}`,
      client_email: clientEmail.trim().toLowerCase(),
      client_name: clientName.trim() || clientEmail.split("@")[0],
      title: title.trim(),
      radicado: radicado.trim(),
      filed_date: radicado.trim(),
      process_type: processType,
      status: status,
      status_type: progress >= 75 ? "success" : progress >= 35 ? "info" : "warning",
      authority: authority.trim(),
      city: "Bogotá D.C.",
      lawyer: lawyer.trim(),
      last_update: new Date().toISOString().split("T")[0],
      progress: Number(progress),
      balance: Number(balance) || 0,
      total_fees: Number(totalFees) || 0,
      documents_count: existingCase?.documents_count || 1,
      counterparty: counterparty.trim(),
      observations: observations.trim(),
      current_phase: `Fase actual: ${status}`,
      phases: defaultPhases,
    };

    onSaveCase(updatedCase);
    onClose();
  };

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
        zIndex: 2100,
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "var(--ink-panel)",
          border: "1px solid var(--brass)",
          borderRadius: "8px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          color: "var(--text-bright)",
          boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <span style={{ fontSize: "0.72rem", color: "var(--brass)", fontWeight: 700, textTransform: "uppercase" }}>
              Panel del Abogado · Gestión de Expedientes
            </span>
            <h3 style={{ margin: "2px 0 0", fontSize: "1.25rem", color: "var(--text-bright)", fontFamily: "var(--font-heading)" }}>
              {existingCase ? "Editar Proceso Judicial & Adelantos" : "Crear Nuevo Proceso y Asignar a Cliente"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.4rem", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Título y Radicado */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Título del Caso / Objeto Litigioso *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Proceso de Restitución de Inmueble Arrendado"
                style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Radicado Judicial (23 dígitos o referencia)
              </label>
              <input
                type="text"
                value={radicado}
                onChange={(e) => setRadicado(e.target.value)}
                placeholder="11001-31-03-015-2026-00412-00"
                style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          {/* ASIGNACIÓN DE CLIENTE Y VINCULACIÓN POR ID (SOLICITADO POR EL USUARIO) */}
          <div style={{ background: "rgba(217, 181, 106, 0.08)", border: "1px solid var(--brass)", padding: "16px", borderRadius: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--brass-light)", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              👤 Asignación de Cliente & ID de Base de Datos (Supabase)
            </span>

            {/* Selector rápido si hay usuarios registrados */}
            {registeredUsers.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "0.74rem", color: "var(--text-bright)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                  Seleccionar Cliente Registrado (Autocompletar ID, Nombre y Correo):
                </label>
                <select
                  onChange={(e) => handleSelectPredefinedUser(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--ink-soft)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.82rem" }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Seleccione un cliente para vincular --</option>
                  {registeredUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email || "Sin email"}) — ID: {u.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Correo electrónico del Cliente * (con el que inicia sesión)
                </label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="ejemplo: cliente@jalegal.com.co"
                  style={{ width: "100%", padding: "8px 12px", background: "var(--ink-soft)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Nombre Completo del Cliente Titular
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Dr. Roberto Mendoza Vargas"
                  style={{ width: "100%", padding: "8px 12px", background: "var(--ink-soft)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
                />
              </div>
            </div>

            {/* Campo explícito de ID de Usuario (client_id / UUID) */}
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                ID de Usuario del Cliente en Supabase (UUID en tabla <code>profiles.id</code>) *
              </label>
              <input
                type="text"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="UUID de Supabase o ID del usuario (ej: usr_demo_client_01)"
                style={{ width: "100%", padding: "8px 12px", background: "var(--ink-soft)", border: "1px solid var(--line)", color: "var(--brass-light)", borderRadius: "4px", fontSize: "0.82rem", fontFamily: "monospace" }}
              />
              <small style={{ color: "var(--text-muted)", fontSize: "0.68rem", marginTop: "4px", display: "block" }}>
                🔗 Clave foránea en la base de datos: <code>cases.client_id references profiles.id</code>. Solo el usuario con este ID y correo podrá acceder a ver los adelantos de este caso.
              </small>
            </div>
          </div>

          {/* Rama y Despacho */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Tipo / Rama Procesal
              </label>
              <select
                value={processType}
                onChange={(e) => setProcessType(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
              >
                <option value="Proceso Civil Ordinario">Proceso Civil Ordinario</option>
                <option value="Restitución de Inmueble (Art. 384 CGP)">Restitución de Inmueble (Art. 384 CGP)</option>
                <option value="Proceso Ejecutivo de Cobro de Facturas / Pagarés">Proceso Ejecutivo de Cobro de Facturas / Pagarés</option>
                <option value="Derecho Comercial & Societario">Derecho Comercial & Societario</option>
                <option value="Derecho Laboral & Seguridad Social">Derecho Laboral & Seguridad Social</option>
                <option value="Sucesiones & Familia">Sucesiones & Familia</option>
                <option value="Trámite Extrajudicial / Conciliación Prejudicial">Trámite Extrajudicial / Conciliación Prejudicial</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Juzgado / Despacho Judicial
              </label>
              <input
                type="text"
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                placeholder="Juzgado 15 Civil Municipal de Bogotá"
                style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          {/* ADELANTOS / PROGRESO DEL CASO (SOLICITADO POR EL USUARIO) */}
          <div style={{ background: "var(--ink-soft)", padding: "14px", borderRadius: "6px", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--text-bright)", fontWeight: 600 }}>
                📈 Porcentaje de Avance Procesal (Adelanto del Caso):
              </label>
              <span style={{ fontSize: "1rem", fontWeight: 700, color: progress >= 75 ? "#4ade80" : "var(--brass)" }}>
                {progress}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--brass)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>0% Inicio / Radicación</span>
              <span>50% Pruebas y Audiencia</span>
              <span>100% Sentencia Cumplida</span>
            </div>
          </div>

          {/* Estado actual y Abogado */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Estado / Etapa Actual que verá el Cliente
              </label>
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Ej: Auto admisorio proferido · Traslado de demanda"
                style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Abogado Responsable
              </label>
              <input
                type="text"
                value={lawyer}
                onChange={(e) => setLawyer(e.target.value)}
                placeholder="Dra. Carolina Jiménez / Dr. Marlon Jiménez"
                style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          {/* Honorarios y Contraparte */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Honorarios Totales ($ COP)
              </label>
              <input
                type="number"
                value={totalFees}
                onChange={(e) => setTotalFees(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Saldo por Cobrar ($ COP)
              </label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Parte Contraria (Demandado/a)
              </label>
              <input
                type="text"
                value={counterparty}
                onChange={(e) => setCounterparty(e.target.value)}
                placeholder="Ej: Inversiones del Norte S.A.S."
                style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem" }}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
              Observaciones del Abogado para el Cliente
            </label>
            <textarea
              rows={3}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              placeholder="Instrucciones sobre la próxima diligencia o estado de las pruebas..."
              style={{ width: "100%", padding: "9px 12px", background: "var(--parchment-deep)", border: "1px solid var(--line)", color: "var(--text-bright)", borderRadius: "4px", fontSize: "0.85rem", resize: "vertical" }}
            />
          </div>

          {/* Footer buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--line)" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "9px 16px", background: "transparent", border: "1px solid var(--line)", color: "var(--text-muted)", borderRadius: "4px", cursor: "pointer", fontSize: "0.82rem" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ padding: "9px 20px", background: "var(--brass)", color: "var(--ink)", fontWeight: 700, border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}
            >
              {existingCase ? "Guardar Cambios del Caso" : "Crear y Asignar Caso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
