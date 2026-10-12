import logo from "../assets/ja-legal-logo.svg";
import { firm, navigation } from "../data/site";
import { downloadWordDossier } from "../utils/downloadWordDossier";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footergrid">
          <div className="footer-brand-col">
            <img src={logo} alt={firm.name} className="footer-logo" />
            <p>{firm.tagline}</p>
            <p className="footer-address">{firm.address}</p>
            <div style={{ marginTop: "12px" }}>
              <button
                type="button"
                onClick={downloadWordDossier}
                style={{
                  background: "transparent",
                  border: "1px solid var(--brass)",
                  color: "var(--brass-light)",
                  padding: "6px 12px",
                  borderRadius: "3px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>📥 Descargar Dossier (.doc / Word)</span>
              </button>
            </div>
          </div>
          <div className="footer-links-col">
            <p className="col-title">
              <strong>Navegación</strong>
            </p>
            {navigation.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
            <a href="#portal">Portal de Clientes</a>
          </div>
          <div className="footer-contact-col">
            <p className="col-title">
              <strong>Contacto Directo</strong>
            </p>
            <a href={`mailto:${firm.email}`}>{firm.email}</a>
            <a href={`tel:${firm.phoneHref}`}>{firm.phone}</a>
            <p className="coverage">{firm.cities} · Atención nacional</p>
            <p style={{ fontSize: "0.72rem", color: "#647087", marginTop: "8px", lineHeight: 1.4 }}>
              🛡️ Protección de datos personales amparada por la Ley 1581 de 2012 y Secreto Profesional (Art. 74 C.P.).
            </p>
          </div>
        </div>
        <div className="bottom">
          <span>© 2026 {firm.name}. NIT 901.482.119-4. Todos los derechos reservados.</span>
          <span>Derecho Procesal · Litigio Estratégico · Asesoría Corporativa · LegalTech</span>
        </div>
      </div>
    </footer>
  );
}
