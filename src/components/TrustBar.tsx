import { downloadWordDossier } from "../utils/downloadWordDossier";

export function TrustBar() {
  return (
    <section className="trust-bar-section">
      <div className="container">
        <div className="trust-grid">
          <div className="trust-card">
            <span className="trust-icon">🏛️</span>
            <div>
              <strong>Colegiatura & CSJ</strong>
              <p>Tarjetas profesionales vigentes ante el Consejo Superior de la Judicatura.</p>
            </div>
          </div>

          <div className="trust-card">
            <span className="trust-icon">⚡</span>
            <div>
              <strong>Expediente Digital 24/7</strong>
              <p>Portal privado con seguimiento en tiempo real, autos y notificaciones.</p>
            </div>
          </div>

          <div className="trust-card">
            <span className="trust-icon">🔒</span>
            <div>
              <strong>Seguridad & Habeas Data</strong>
              <p>Cifrado bancario SSL 256-bit y reserva legal conforme a la Ley 1581 de 2012.</p>
            </div>
          </div>

          <div className="trust-card">
            <span className="trust-icon">⚖️</span>
            <div>
              <strong>Cobertura Nacional</strong>
              <p>Sedes en Bogotá, Barranquilla y Medellín con representación en todo el país.</p>
            </div>
          </div>
        </div>

        {/* Banner de Presentación para el Cliente */}
        <div className="dossier-download-banner">
          <div className="dossier-text">
            <span className="dossier-tag">DOCUMENTACIÓN OFICIAL</span>
            <h4>¿Desea conocer la propuesta integral de la firma?</h4>
            <p>Descargue nuestro Dossier Corporativo en formato Word (.doc) con el portafolio de servicios, tarifas y metodología de trabajo.</p>
          </div>
          <button
            type="button"
            onClick={downloadWordDossier}
            className="btn-download-dossier"
            title="Descargar documento Word para imprimir o enviar al cliente"
          >
            <span>📥 Descargar Dossier en Word (.doc)</span>
          </button>
        </div>
      </div>
    </section>
  );
}
