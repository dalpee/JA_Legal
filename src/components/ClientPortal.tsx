import { useState } from "react";
import logo from "../assets/logoempresa.png";

const caseData = {
  clientName: "Cliente demostración",
  initials: "CD",
  processTitle: "Consulta laboral - Revisión inicial",
  status: "En trámite",
  filedDate: "Recibido 21-sep-2026",
  authority: "Equipo jurídico J&A",
  lawyer: "Marlon David Jiménez Padilla",
  lastUpdate: "21 de septiembre de 2026",
  progress: 35,
  balance: "$0",
  documents: 3,
};

const agenda = [
  { day: "24", month: "SEP", title: "Revisión de documentos", detail: "10:00 a. m. · Equipo jurídico" },
  { day: "26", month: "SEP", title: "Llamada de seguimiento", detail: "3:00 p. m. · WhatsApp" },
  { day: "30", month: "SEP", title: "Entrega de orientación inicial", detail: "Documento digital" },
];

const history = [
  {
    date: "21 sep. 2026",
    title: "Consulta registrada",
    detail: "El cliente envió la descripción inicial de su caso.",
    note: "Visible para el cliente",
  },
  {
    date: "22 sep. 2026",
    title: "Revisión preliminar",
    detail: "La firma inició el análisis jurídico y clasificó el área de consulta.",
    note: "Actualización de la firma",
  },
  {
    date: "24 sep. 2026",
    title: "Documentos solicitados",
    detail: "Se solicitaron soportes adicionales para completar el estudio del caso.",
    note: "Documento pendiente",
  },
];

export function ClientPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState<"client" | "firm">("client");

  if (isLoggedIn) {
    return (
      <main className="portal-dashboard">
        <header className="portal-topbar">
          <a href="/" className="portal-back">← Volver a la página</a>
          <div className="portal-brand">
            <img src={logo} alt="J&A Legal" />
            <div>
              <strong>J&A Legal</strong>
              <span>Sistema Integral de Gestión Jurídica</span>
            </div>
          </div>
          <button className="portal-logout" type="button" onClick={() => setIsLoggedIn(false)}>
            Cerrar sesión
          </button>
        </header>

        <div className="portal-shell">
          <aside className="portal-sidebar">
            <div className="portal-user">
              <span>{caseData.initials}</span>
              <div>
                <strong>{caseData.clientName}</strong>
                <small>{role === "client" ? "Cliente" : "Firma"}</small>
              </div>
            </div>

            <nav className="portal-menu" aria-label="Portal de clientes">
              <a className="active" href="#resumen">Resumen</a>
              <a href="#proceso">Procesos</a>
              <a href="#agenda">Calendario</a>
              <a href="#documentos">Documentos</a>
              <a href="#historial">Historial</a>
            </nav>

            <p className="portal-private">Acceso privado de demostración</p>
          </aside>

          <section className="portal-content" id="resumen">
            <p className="eyebrow">Bienvenido a su portal</p>
            <h1>Resumen del caso</h1>

            <div className="portal-stats">
              <article>
                <span>Procesos activos</span>
                <strong>1</strong>
                <small>En seguimiento</small>
              </article>
              <article>
                <span>Próximo evento</span>
                <strong>24 sep.</strong>
                <small>Revisión de documentos</small>
              </article>
              <article>
                <span>Saldo pendiente</span>
                <strong>{caseData.balance}</strong>
                <small>Honorarios</small>
              </article>
              <article>
                <span>Documentos</span>
                <strong>{caseData.documents}</strong>
                <small>Disponibles</small>
              </article>
            </div>

            <div className="portal-main-grid">
              <article className="portal-panel process-panel" id="proceso">
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Proceso principal</p>
                    <h2>{caseData.processTitle}</h2>
                  </div>
                  <span className="status-pill">{caseData.status}</span>
                </div>

                <dl className="case-details">
                  <div>
                    <dt>Radicado</dt>
                    <dd>{caseData.filedDate}</dd>
                  </div>
                  <div>
                    <dt>Autoridad</dt>
                    <dd>{caseData.authority}</dd>
                  </div>
                  <div>
                    <dt>Abogado encargado</dt>
                    <dd>{caseData.lawyer}</dd>
                  </div>
                  <div>
                    <dt>Última actualización</dt>
                    <dd>{caseData.lastUpdate}</dd>
                  </div>
                </dl>

                <div className="progress-block">
                  <div>
                    <span>Avance general</span>
                    <strong>{caseData.progress}%</strong>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${caseData.progress}%` }} />
                  </div>
                </div>
              </article>

              <article className="portal-panel" id="agenda">
                <div className="panel-title-row">
                  <div>
                    <p className="eyebrow">Próximamente</p>
                    <h2>Agenda</h2>
                  </div>
                  <a href="#agenda">Ver calendario</a>
                </div>

                <div className="agenda-list">
                  {agenda.map((item) => (
                    <div className="agenda-item" key={`${item.day}-${item.title}`}>
                      <time>
                        <strong>{item.day}</strong>
                        <span>{item.month}</span>
                      </time>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="portal-panel history-panel" id="historial">
              <div className="panel-title-row">
                <div>
                  <p className="eyebrow">Historial</p>
                  <h2>Últimas actuaciones</h2>
                </div>
                <a href="#proceso">Ver proceso completo</a>
              </div>

              <div className="timeline">
                {history.map((item) => (
                  <div className="timeline-item" key={item.title}>
                    <span className="timeline-dot" />
                    <time>{item.date}</time>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.detail}</p>
                      <small>{item.note}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="client-portal login-view">
      <a href="/" className="portal-back login-back">← Volver a la página</a>

      <section className="portal-card login-card">
        <img src={logo} alt="Jiménez & Ariza Asociados" className="portal-logo" />

        <p className="eyebrow">Acceso privado</p>
        <h1>Seguimiento y gestión de procesos</h1>
        <p className="portal-text">
          Consulte el estado de su caso, próximas actuaciones, documentos y novedades compartidas por la firma.
        </p>

        <form
          className="portal-form"
          onSubmit={(event) => {
            event.preventDefault();
            setIsLoggedIn(true);
          }}
        >
          <label>
            Correo electrónico
            <input type="email" defaultValue="cliente@demo.com" required />
          </label>

          <label>
            Contraseña
            <input type="password" defaultValue="demo2026" required />
          </label>

          <div className="role-selector" aria-label="Tipo de acceso">
            <button className={role === "client" ? "selected" : ""} type="button" onClick={() => setRole("client")}>
              <strong>Cliente</strong>
              <span>Consultar mi proceso</span>
            </button>
            <button className={role === "firm" ? "selected" : ""} type="button" onClick={() => setRole("firm")}>
              <strong>Firma</strong>
              <span>Administrar procesos</span>
            </button>
          </div>

          <button className="btn primary" type="submit">
            Ingresar al portal de demostración
          </button>
        </form>

        <p className="portal-footnote">
          Esta vista es una demostración visual. Para usar clientes reales, el acceso debe conectarse con Supabase Auth y tablas de procesos.
        </p>
      </section>
    </main>
  );
}
