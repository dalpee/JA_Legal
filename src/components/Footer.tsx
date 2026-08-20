import logo from "../assets/ja-legal-logo.svg";
import { firm, navigation } from "../data/site";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footergrid">
          <div>
            <img src={logo} alt={firm.name} className="footer-logo" />
            <p>{firm.tagline}</p>
          </div>
          <div>
            <p>
              <strong>Enlaces</strong>
            </p>
            {navigation.map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
          </div>
          <div>
            <p>
              <strong>Contacto</strong>
            </p>
            <a href={`mailto:${firm.email}`}>{firm.email}</a>
            <a href={`tel:${firm.phoneHref}`}>{firm.phone}</a>
          </div>
        </div>
        <div className="bottom">
          <span>© 2026 {firm.name}. Todos los derechos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
