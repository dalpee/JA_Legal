import { useState, useMemo } from "react";
import { CaseRecord } from "../types/portal";
import { StoredUser } from "../lib/supabaseClient";

interface AdminDashboardProps {
  allCases: CaseRecord[];
  onSelectCase: (caseRecord: CaseRecord) => void;
  onCreateNewCase: (prefilledClientId?: string, prefilledClientEmail?: string, prefilledClientName?: string) => void;
  onEditCase: (caseRecord: CaseRecord) => void;
  onDeleteCase: (caseId: string) => void;
  registeredUsers: StoredUser[];
  onNavigateToSection: (section: "resumen" | "proceso" | "agenda" | "documentos" | "historial" | "economia") => void;
}

export function AdminDashboard({
  allCases,
  onSelectCase,
  onCreateNewCase,
  onEditCase,
  onDeleteCase,
  registeredUsers,
  onNavigateToSection,
}: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState<"all" | "client_name" | "client_id">("all");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<"casos" | "clientes">("casos");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copiar ID de usuario al portapapeles
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtrado de casos por nombre o ID del cliente, radicado y título
  const filteredCases = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allCases.filter((c) => {
      // Resolver nombre y correo del usuario desde el directorio si no está presente en el caso
      const assignedUser = registeredUsers.find(
        (u) => u.id === c.client_id || (c.client_email && u.email.toLowerCase() === c.client_email.toLowerCase())
      );

      const clientName = (c.client_name || assignedUser?.full_name || "").toLowerCase();
      const clientId = (c.client_id || "").toLowerCase();
      const clientEmail = (c.client_email || assignedUser?.email || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      const radicado = (c.radicado || "").toLowerCase();

      let matchSearch = true;
      if (term) {
        if (searchField === "client_name") {
          matchSearch = clientName.includes(term);
        } else if (searchField === "client_id") {
          matchSearch = clientId.includes(term);
        } else {
          // Búsqueda inteligente: Nombre del cliente, ID, correo, radicado o título
          matchSearch =
            clientName.includes(term) ||
            clientId.includes(term) ||
            clientEmail.includes(term) ||
            radicado.includes(term) ||
            title.includes(term);
        }
      }

      const matchBranch =
        selectedBranchFilter === "all" ||
        c.process_type.toLowerCase().includes(selectedBranchFilter.toLowerCase());

      return matchSearch && matchBranch;
    });
  }, [allCases, searchTerm, searchField, selectedBranchFilter, registeredUsers]);

  // Cálculos estadísticos
  const totalFees = allCases.reduce((acc, c) => acc + (Number(c.total_fees) || 0), 0);
  const totalBalance = allCases.reduce((acc, c) => acc + (Number(c.balance) || 0), 0);
  const totalClients = registeredUsers.filter((u) => u.role === "client").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Encabezado del Dashboard de Administración */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(217, 181, 106, 0.12) 0%, rgba(15, 39, 68, 0.6) 100%)",
          border: "1px solid var(--brass)",
          borderRadius: "8px",
          padding: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <span style={{ fontSize: "0.72rem", color: "var(--brass-light)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Módulo del Abogado Titular · Admin Control
          </span>
          <h2 style={{ margin: "4px 0 6px", fontSize: "1.5rem", color: "var(--text-bright)", fontFamily: "var(--font-heading)" }}>
            Panel de Administración Procesal & Asignación de Clientes
          </h2>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text)", maxWidth: "620px" }}>
            Cree nuevos procesos judiciales, asigne el <strong>ID de usuario cliente (UUID)</strong> para vincularlos en Supabase y actualice los adelantos que cada titular verá en su pantalla.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onCreateNewCase()}
          style={{
            background: "var(--brass)",
            color: "var(--ink)",
            fontWeight: 700,
            fontSize: "0.88rem",
            padding: "12px 22px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 14px rgba(217, 181, 106, 0.3)",
          }}
        >
          <span>+ Crear Nuevo Caso & Asignar ID</span>
        </button>
      </div>

      {/* Tarjetas de Métricas del Despacho */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Expedientes Registrados</span>
          <strong style={{ fontSize: "1.6rem", display: "block", color: "var(--brass)", marginTop: "4px" }}>
            {allCases.length}
          </strong>
          <small style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Total en despacho</small>
        </div>

        <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Clientes en Base de Datos</span>
          <strong style={{ fontSize: "1.6rem", display: "block", color: "#38bdf8", marginTop: "4px" }}>
            {totalClients}
          </strong>
          <small style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Usuarios con cuenta creada</small>
        </div>

        <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Honorarios Globales Pactados</span>
          <strong style={{ fontSize: "1.4rem", display: "block", color: "#4ade80", marginTop: "4px" }}>
            ${totalFees.toLocaleString("es-CO")}
          </strong>
          <small style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Cuantía global de contratos</small>
        </div>

        <div style={{ background: "var(--ink-soft)", padding: "16px", borderRadius: "6px", border: "1px solid var(--line)" }}>
          <span style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Saldo por Recaudar</span>
          <strong style={{ fontSize: "1.4rem", display: "block", color: "#facc15", marginTop: "4px" }}>
            ${totalBalance.toLocaleString("es-CO")}
          </strong>
          <small style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>Pendiente de abono</small>
        </div>
      </div>

      {/* Selector de Pestañas: Casos vs Directorio de Clientes */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
        <button
          type="button"
          onClick={() => setActiveTab("casos")}
          style={{
            background: activeTab === "casos" ? "var(--brass)" : "transparent",
            color: activeTab === "casos" ? "var(--ink)" : "var(--text)",
            border: activeTab === "casos" ? "none" : "1px solid var(--line)",
            fontWeight: 700,
            fontSize: "0.82rem",
            padding: "8px 18px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          📂 Gestión de Expedientes ({allCases.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("clientes")}
          style={{
            background: activeTab === "clientes" ? "var(--brass)" : "transparent",
            color: activeTab === "clientes" ? "var(--ink)" : "var(--text)",
            border: activeTab === "clientes" ? "none" : "1px solid var(--line)",
            fontWeight: 700,
            fontSize: "0.82rem",
            padding: "8px 18px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          👥 Directorio de Clientes & IDs de Supabase ({registeredUsers.length})
        </button>
      </div>

      {/* PESTAÑA 1: GESTIÓN DE EXPEDIENTES */}
      {activeTab === "casos" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* BARRA DE BÚSQUEDA ESPECIALIZADA POR NOMBRE O ID DE CLIENTE */}
          <div
            style={{
              background: "var(--ink-soft)",
              border: "1px solid var(--line)",
              borderRadius: "8px",
              padding: "16px 18px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.12)",
            }}
          >
            {/* Cabecera del Buscador con Estado Activo */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.05rem" }}>🔍</span>
                <strong style={{ fontSize: "0.86rem", color: "var(--text-bright)" }}>
                  Buscar & Filtrar Casos por Cliente o ID (UUID)
                </strong>
                {searchTerm && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      background: "rgba(217, 181, 106, 0.18)",
                      color: "var(--brass-light)",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontWeight: 600,
                      border: "1px solid rgba(217, 181, 106, 0.3)",
                    }}
                  >
                    {filteredCases.length} caso(s) encontrado(s)
                  </span>
                )}
              </div>

              {/* Botón rápido para limpiar filtro activo */}
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--brass-light)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                  title="Restablecer búsqueda"
                >
                  ✕ Limpiar filtro
                </button>
              )}
            </div>

            {/* Fila Principal de la Barra de Búsqueda */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              {/* Campo de búsqueda con icono de borrado */}
              <div style={{ position: "relative", flex: 2, minWidth: "260px" }}>
                <input
                  type="text"
                  placeholder={
                    searchField === "client_name"
                      ? "Filtrar por nombre del cliente (ej. Carlos, Roberto, Mendoza)..."
                      : searchField === "client_id"
                      ? "Filtrar por ID de cliente en Supabase (ej. usr_..., UUID)..."
                      : "Buscar por nombre del cliente, ID (UUID), radicado o título..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 36px 10px 14px",
                    background: "var(--parchment-deep)",
                    border: searchTerm ? "1px solid var(--brass)" : "1px solid var(--line)",
                    borderRadius: "5px",
                    color: "var(--text-bright)",
                    fontSize: "0.85rem",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                    title="Borrar texto"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Criterio de Búsqueda: Todos / Solo Nombre / Solo ID */}
              <div
                style={{
                  display: "flex",
                  gap: "2px",
                  background: "var(--parchment-deep)",
                  padding: "3px",
                  borderRadius: "5px",
                  border: "1px solid var(--line)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSearchField("all")}
                  style={{
                    padding: "6px 10px",
                    fontSize: "0.74rem",
                    fontWeight: searchField === "all" ? 700 : 500,
                    background: searchField === "all" ? "var(--brass)" : "transparent",
                    color: searchField === "all" ? "var(--ink)" : "var(--text)",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setSearchField("client_name")}
                  style={{
                    padding: "6px 10px",
                    fontSize: "0.74rem",
                    fontWeight: searchField === "client_name" ? 700 : 500,
                    background: searchField === "client_name" ? "var(--brass)" : "transparent",
                    color: searchField === "client_name" ? "var(--ink)" : "var(--text)",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  title="Filtrar exclusivamente por el nombre del cliente titular"
                >
                  👤 Por Nombre
                </button>
                <button
                  type="button"
                  onClick={() => setSearchField("client_id")}
                  style={{
                    padding: "6px 10px",
                    fontSize: "0.74rem",
                    fontWeight: searchField === "client_id" ? 700 : 500,
                    background: searchField === "client_id" ? "var(--brass)" : "transparent",
                    color: searchField === "client_id" ? "var(--ink)" : "var(--text)",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                  }}
                  title="Filtrar exclusivamente por el UUID de Supabase asignado"
                >
                  🔑 Por ID (UUID)
                </button>
              </div>

              {/* Filtro por Jurisdicción / Rama */}
              <select
                value={selectedBranchFilter}
                onChange={(e) => setSelectedBranchFilter(e.target.value)}
                style={{
                  padding: "9px 12px",
                  background: "var(--parchment-deep)",
                  border: "1px solid var(--line)",
                  borderRadius: "5px",
                  color: "var(--text-bright)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                <option value="all">Todas las ramas</option>
                <option value="civil">Civil</option>
                <option value="restitucion">Restitución</option>
                <option value="comercial">Comercial</option>
                <option value="laboral">Laboral</option>
                <option value="familia">Familia</option>
              </select>

              {/* Botón de Vistas y Añadir Caso */}
              <div style={{ display: "flex", gap: "8px", marginLeft: "auto", alignItems: "center" }}>
                <div
                  style={{
                    display: "flex",
                    background: "var(--parchment-deep)",
                    border: "1px solid var(--line)",
                    borderRadius: "4px",
                    padding: "2px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    style={{
                      background: viewMode === "table" ? "var(--brass)" : "transparent",
                      color: viewMode === "table" ? "var(--ink)" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "3px",
                      padding: "6px 10px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title="Vista en tabla"
                  >
                    📋 Tabla
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    style={{
                      background: viewMode === "cards" ? "var(--brass)" : "transparent",
                      color: viewMode === "cards" ? "var(--ink)" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "3px",
                      padding: "6px 10px",
                      fontSize: "0.74rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title="Vista en tarjetas"
                  >
                    🗂️ Tarjetas
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onCreateNewCase()}
                  style={{
                    background: "var(--brass)",
                    color: "var(--ink)",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 8px rgba(217, 181, 106, 0.25)",
                  }}
                >
                  + Añadir Caso
                </button>
              </div>
            </div>

            {/* Chips de Selección Rápida de Clientes Registrados */}
            {registeredUsers.filter((u) => u.role === "client").length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", paddingTop: "2px" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  Filtrar rápido por cliente:
                </span>
                {registeredUsers
                  .filter((u) => u.role === "client")
                  .slice(0, 6)
                  .map((u) => {
                    const isSelected = searchTerm === u.full_name || searchTerm === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSearchTerm("");
                          } else {
                            setSearchTerm(u.full_name);
                            setSearchField("client_name");
                          }
                        }}
                        style={{
                          background: isSelected ? "var(--brass)" : "rgba(56, 189, 248, 0.08)",
                          color: isSelected ? "var(--ink)" : "#38bdf8",
                          border: `1px solid ${isSelected ? "var(--brass)" : "rgba(56, 189, 248, 0.25)"}`,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.15s ease",
                        }}
                        title={`Filtrar casos de ${u.full_name} (ID: ${u.id})`}
                      >
                        <span>👤 {u.full_name.split(" ")[0]}</span>
                        <code style={{ fontSize: "0.62rem", opacity: 0.85 }}>({u.id.slice(0, 8)}…)</code>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Listado de Casos */}
          {filteredCases.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", background: "var(--ink-soft)", borderRadius: "6px", border: "1px dashed var(--line)" }}>
              <p style={{ margin: "0 0 12px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                {allCases.length === 0
                  ? "No hay procesos registrados todavía en el sistema. Haga clic en '+ Crear Nuevo Caso & Asignar ID' para dar de alta el primero."
                  : "No se encontraron procesos que coincidan con la búsqueda o filtro seleccionado."}
              </p>
              {allCases.length === 0 && (
                <button
                  type="button"
                  onClick={() => onCreateNewCase()}
                  style={{ background: "var(--brass)", color: "var(--ink)", padding: "10px 20px", border: "none", borderRadius: "4px", fontWeight: 700, cursor: "pointer" }}
                >
                  Crear Primer Caso
                </button>
              )}
            </div>
          ) : viewMode === "table" ? (
            /* ========================================================
               TABLA ESTRUCTURADA DE CASOS EN SUPABASE
               ======================================================== */
            <div
              style={{
                background: "var(--parchment-deep)",
                border: "1px solid var(--line)",
                borderRadius: "6px",
                overflow: "hidden",
                boxShadow: "0 4px 18px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.82rem",
                    textAlign: "left",
                    minWidth: "920px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "var(--ink-panel)",
                        borderBottom: "2px solid var(--brass)",
                        color: "var(--brass-light)",
                      }}
                    >
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Expediente / Proceso
                      </th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Cliente Titular (Supabase)
                      </th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Rama
                      </th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Adelanto Procesal
                      </th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Honorarios & Saldo
                      </th>
                      <th style={{ padding: "12px 14px", fontWeight: 700, fontSize: "0.74rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((c, index) => {
                      const assignedUser = registeredUsers.find(
                        (u) => u.id === c.client_id || (c.client_email && u.email.toLowerCase() === c.client_email.toLowerCase())
                      );

                      return (
                        <tr
                          key={c.id}
                          style={{
                            borderBottom: "1px solid var(--line)",
                            background: index % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                            transition: "background 0.15s ease",
                          }}
                        >
                          {/* Columna 1: Expediente / Título / Radicado */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <strong style={{ color: "var(--text-bright)", fontSize: "0.88rem" }}>
                                {c.title}
                              </strong>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--brass-light)", fontFamily: "monospace" }}>
                                  Rad: {c.radicado || "En radicación"}
                                </span>
                                {c.authority && (
                                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                    · 🏛️ {c.authority}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Columna 2: Cliente Vinculado (Nombre, Email, UUID) */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                              <span style={{ color: "#38bdf8", fontWeight: 600, fontSize: "0.82rem" }}>
                                👤 {c.client_name || assignedUser?.full_name || "Sin nombre registrado"}
                              </span>
                              <span style={{ color: "var(--text-muted)", fontSize: "0.74rem" }}>
                                ✉️ {c.client_email || assignedUser?.email || "Sin correo"}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                <code
                                  style={{
                                    fontSize: "0.66rem",
                                    background: "rgba(0, 0, 0, 0.35)",
                                    padding: "2px 5px",
                                    borderRadius: "3px",
                                    color: "var(--brass)",
                                    maxWidth: "150px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={`UUID: ${c.client_id}`}
                                >
                                  ID: {c.client_id}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => handleCopyId(c.client_id)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "var(--text-muted)",
                                    fontSize: "0.66rem",
                                    cursor: "pointer",
                                    padding: 0,
                                    textDecoration: "underline",
                                  }}
                                  title="Copiar ID del cliente"
                                >
                                  {copiedId === c.client_id ? "¡Copiado!" : "Copiar"}
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* Columna 3: Rama Procesal */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <span
                              style={{
                                fontSize: "0.72rem",
                                background: "rgba(217, 181, 106, 0.12)",
                                color: "var(--brass-light)",
                                padding: "3px 8px",
                                borderRadius: "3px",
                                border: "1px solid rgba(217, 181, 106, 0.25)",
                                display: "inline-block",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.process_type}
                            </span>
                          </td>

                          {/* Columna 4: Adelanto Procesal & Estado */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: "130px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                  Avance:
                                </span>
                                <strong style={{ fontSize: "0.78rem", color: c.progress >= 75 ? "#4ade80" : "var(--brass)" }}>
                                  {c.progress}%
                                </strong>
                              </div>
                              <div
                                style={{
                                  height: "6px",
                                  background: "rgba(255, 255, 255, 0.08)",
                                  borderRadius: "3px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${c.progress}%`,
                                    height: "100%",
                                    background: c.progress >= 75 ? "#4ade80" : "var(--brass)",
                                    borderRadius: "3px",
                                    transition: "width 0.3s ease",
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  color: "var(--text-muted)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "140px",
                                }}
                                title={c.status}
                              >
                                {c.status}
                              </span>
                            </div>
                          </td>

                          {/* Columna 5: Honorarios & Saldo */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <strong style={{ color: "var(--text-bright)", fontSize: "0.82rem" }}>
                                ${(Number(c.total_fees) || 0).toLocaleString("es-CO")}
                              </strong>
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: Number(c.balance) > 0 ? "#facc15" : "#4ade80",
                                  fontWeight: 600,
                                }}
                              >
                                Saldo: ${(Number(c.balance) || 0).toLocaleString("es-CO")}
                              </span>
                            </div>
                          </td>

                          {/* Columna 6: Acciones (Editar, Eliminar, Ver) */}
                          <td style={{ padding: "12px 14px", verticalAlign: "middle", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", alignItems: "center" }}>
                              {/* Botón Ver en Portal */}
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectCase(c);
                                  onNavigateToSection("resumen");
                                }}
                                style={{
                                  background: "transparent",
                                  border: "1px solid var(--line)",
                                  color: "var(--text)",
                                  padding: "5px 8px",
                                  borderRadius: "3px",
                                  fontSize: "0.74rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title="Abrir en vista de expediente"
                              >
                                <span>👁️ Ver</span>
                              </button>

                              {/* Botón Editar Caso */}
                              <button
                                type="button"
                                onClick={() => onEditCase(c)}
                                style={{
                                  background: "rgba(217, 181, 106, 0.15)",
                                  border: "1px solid var(--brass)",
                                  color: "var(--brass-light)",
                                  padding: "5px 10px",
                                  borderRadius: "3px",
                                  fontSize: "0.74rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title="Modificar expediente, vincular cliente o actualizar adelantos"
                              >
                                <span>✏️ Editar</span>
                              </button>

                              {/* Botón Eliminar Caso */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`¿Está seguro de eliminar el proceso "${c.title}" de la base de datos de Supabase? Esta acción no se puede deshacer.`)) {
                                    onDeleteCase(c.id);
                                  }
                                }}
                                style={{
                                  background: "rgba(239, 68, 68, 0.12)",
                                  border: "1px solid #ef4444",
                                  color: "#f87171",
                                  padding: "5px 8px",
                                  borderRadius: "3px",
                                  fontSize: "0.74rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title="Eliminar entrada de Supabase"
                              >
                                <span>🗑️ Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pie de Tabla con Resumen y Estado de Supabase */}
              <div
                style={{
                  background: "var(--ink-soft)",
                  padding: "10px 16px",
                  borderTop: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.74rem",
                  color: "var(--text-muted)",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  Mostrando <strong>{filteredCases.length}</strong> de <strong>{allCases.length}</strong> expedientes registrados
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80" }} />
                  <span>Sincronización activa con Supabase PostgreSQL</span>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               VISTA DE TARJETAS (FALLBACK / MODO VISUAL)
               ======================================================== */
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredCases.map((c) => {
                const assignedUser = registeredUsers.find(
                  (u) => u.id === c.client_id || (c.client_email && u.email.toLowerCase() === c.client_email.toLowerCase())
                );

                return (
                  <div
                    key={c.id}
                    style={{
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      transition: "border-color 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.72rem", background: "rgba(217, 181, 106, 0.15)", color: "var(--brass-light)", padding: "2px 8px", borderRadius: "3px", fontWeight: 700 }}>
                            {c.process_type}
                          </span>
                          {c.radicado && (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              Rad: {c.radicado}
                            </span>
                          )}
                        </div>
                        <h4 style={{ margin: 0, fontSize: "1.1rem", color: "var(--text-bright)", fontFamily: "var(--font-heading)" }}>
                          {c.title}
                        </h4>
                      </div>

                      {/* Botones de Acción */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCase(c);
                            onNavigateToSection("resumen");
                          }}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--line)",
                            color: "var(--text-bright)",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                          title="Abrir este expediente en el portal"
                        >
                          👁️ Ver en Portal
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditCase(c)}
                          style={{
                            background: "rgba(217, 181, 106, 0.15)",
                            border: "1px solid var(--brass)",
                            color: "var(--brass-light)",
                            padding: "6px 12px",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          title="Modificar radicado, adelantos o reasignar cliente"
                        >
                          ✏️ Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Desea eliminar el proceso "${c.title}" de Supabase?`)) {
                              onDeleteCase(c.id);
                            }
                          }}
                          style={{
                            background: "rgba(239, 68, 68, 0.12)",
                            border: "1px solid #ef4444",
                            color: "#f87171",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                          title="Eliminar proceso"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>

                    {/* Fila de Datos Clave: Cliente Asignado & ID, Progreso y Valores */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.3fr 1.2fr 1fr",
                        gap: "14px",
                        background: "var(--ink-soft)",
                        padding: "12px 14px",
                        borderRadius: "4px",
                        border: "1px solid var(--line)",
                      }}
                    >
                      {/* Cliente Vinculado y su ID */}
                      <div>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>
                          Cliente Vinculado en Supabase:
                        </span>
                        <strong style={{ fontSize: "0.85rem", color: "#38bdf8", display: "block", marginTop: "2px" }}>
                          👤 {c.client_name || assignedUser?.full_name || "Sin nombre registrado"}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text)", display: "block" }}>
                          ✉️ {c.client_email || assignedUser?.email || "Sin email"}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                          <code style={{ fontSize: "0.68rem", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: "3px", color: "var(--brass)" }}>
                            ID: {c.client_id}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyId(c.client_id)}
                            style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "0.68rem", cursor: "pointer", textDecoration: "underline" }}
                          >
                            {copiedId === c.client_id ? "¡Copiado!" : "Copiar ID"}
                          </button>
                        </div>
                      </div>

                      {/* Avance Procesal (Adelantos) */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Adelanto Procesal:
                          </span>
                          <strong style={{ fontSize: "0.82rem", color: c.progress >= 75 ? "#4ade80" : "var(--brass)" }}>
                            {c.progress}%
                          </strong>
                        </div>
                        <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden", marginBottom: "6px" }}>
                          <div style={{ width: `${c.progress}%`, height: "100%", background: c.progress >= 75 ? "#4ade80" : "var(--brass)", borderRadius: "3px" }} />
                        </div>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          Fase: {c.status}
                        </span>
                      </div>

                      {/* Aspectos Económicos */}
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>
                          Honorarios Pactados:
                        </span>
                        <strong style={{ fontSize: "0.88rem", color: "var(--text-bright)", display: "block" }}>
                          ${(Number(c.total_fees) || 0).toLocaleString("es-CO")}
                        </strong>
                        <span style={{ fontSize: "0.72rem", color: Number(c.balance) > 0 ? "#facc15" : "#4ade80" }}>
                          Saldo: ${(Number(c.balance) || 0).toLocaleString("es-CO")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PESTAÑA 2: DIRECTORIO DE CLIENTES & IDs DE SUPABASE */}
      {activeTab === "clientes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "14px", borderRadius: "6px" }}>
            <h4 style={{ margin: "0 0 4px", fontSize: "0.9rem", color: "#38bdf8" }}>
              ℹ️ ¿Cómo funciona la vinculación por ID de usuario?
            </h4>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text)" }}>
              Cada cliente registrado tiene un <strong>ID único de usuario (UUID)</strong> en la tabla <code>profiles</code> de Supabase. Al crear un caso, este ID se asigna en <code>cases.client_id</code>, garantizando que cuando ese cliente ingrese a su cuenta, el sistema cargue automáticamente su caso con todos sus adelantos.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
            {registeredUsers
              .filter((u) => u.role === "client")
              .map((u) => {
                const clientCases = allCases.filter(
                  (c) => c.client_id === u.id || (c.client_email && c.client_email.toLowerCase() === u.email.toLowerCase())
                );

                return (
                  <div
                    key={u.id}
                    style={{
                      background: "var(--parchment-deep)",
                      border: "1px solid var(--line)",
                      borderRadius: "6px",
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "2px 8px", borderRadius: "3px", fontWeight: 700 }}>
                          👤 Cliente Titular
                        </span>
                        <span style={{ fontSize: "0.72rem", color: clientCases.length > 0 ? "#4ade80" : "#facc15" }}>
                          {clientCases.length > 0 ? `✅ ${clientCases.length} caso(s) asignado(s)` : "⚠️ Sin caso asignado"}
                        </span>
                      </div>

                      <h4 style={{ margin: "0 0 4px", fontSize: "1.05rem", color: "var(--text-bright)" }}>
                        {u.full_name}
                      </h4>
                      <p style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {u.email}
                      </p>

                      {u.id_number && (
                        <p style={{ margin: "0 0 10px", fontSize: "0.75rem", color: "var(--text)" }}>
                          Documento: {u.id_number}
                        </p>
                      )}

                      {/* Bloque del ID de Usuario de Supabase */}
                      <div
                        style={{
                          background: "var(--ink-soft)",
                          border: "1px dashed var(--line)",
                          padding: "8px 10px",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                      >
                        <div>
                          <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", display: "block" }}>
                            ID de Usuario (client_id):
                          </span>
                          <code style={{ fontSize: "0.75rem", color: "var(--brass)", wordBreak: "break-all" }}>
                            {u.id}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyId(u.id)}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--line)",
                            color: "var(--text-bright)",
                            fontSize: "0.7rem",
                            padding: "4px 8px",
                            borderRadius: "3px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {copiedId === u.id ? "¡Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onCreateNewCase(u.id, u.email, u.full_name)}
                      style={{
                        background: "var(--brass)",
                        color: "var(--ink)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                        padding: "8px 14px",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span>+ Vincular Nuevo Caso a este Cliente</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
