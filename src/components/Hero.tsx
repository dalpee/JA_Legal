export function Hero() {
  return (
    <section id="inicio" className="hero">
      <div className="container herogrid">
        <div className="hero-copy fade-in-up">
          <span className="eyebrow">Firma jurídica en Colombia</span>
          <h1>
            Estrategia legal con <span>resultados reales</span>
          </h1>
          <p>
            Acompañamos personas, empresas y entidades con soluciones jurídicas
            claras, preventivas y orientadas a proteger sus intereses.
          </p>
          <div className="actions">
            <a href="#contacto" className="btn primary">
              Solicitar asesoría
            </a>
            <a href="#servicios" className="btn secondary">
              Conocer servicios
            </a>
          </div>
        </div>

        <aside className="herocard fade-in-up">
          <span className="eyebrow">Consulta jurídica</span>
          <h2>Cuéntenos su caso</h2>
          <p>
            Analizamos su situación y le explicamos las alternativas jurídicas
            disponibles.
          </p>
          <p>
            <strong>Atención:</strong> Personalizada · <strong>Enfoque:</strong>{" "}
            Estratégico · <strong>Cobertura:</strong> Nacional
          </p>
          <a href="#contacto">Iniciar contacto</a>
        </aside>
      </div>
    </section>
  );
}
