import logo from "../assets/ja-legal-logo.svg";
import { firm, navigation } from "../data/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footergrid">
          <div className="footer-brand-col">
            <img src={logo} alt={firm.name} className="footer-logo" />
            <p>{firm.tagline}</p>
            <p className="footer-address">{firm.address}</p>
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
          </div>
        </div>
        <div className="bottom">
          <span>© 2026 {firm.name}. Todos los derechos reservados.</span>
          <span>Derecho Procesal · Litigio Estratégico · Asesoría Corporativa</span>
        </div>
      </div>
    </footer>
  );
}
