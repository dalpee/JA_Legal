import { useState } from "react";
import logoSvg from "../assets/ja-legal-logo.svg";
import { navigation } from "../data/site";

interface NavbarProps {
  onOpenPortal?: () => void;
}

export function Navbar({ onOpenPortal }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handlePortalClick = (e: React.MouseEvent) => {
    closeMenu();
    if (onOpenPortal) {
      e.preventDefault();
      onOpenPortal();
    }
  };

  return (
    <header className="header">
      <div className="container navwrap">
        <a href="#inicio" onClick={closeMenu} className="brand">
          <img
            src={logoSvg}
            alt="Jiménez & Ariza Asociados"
            className="logo"
          />
        </a>

        <nav className={`nav ${menuOpen ? "open" : ""}`} id="mainNav">
          {navigation.map((item) => (
            <a href={item.href} onClick={closeMenu} key={item.href}>
              {item.label}
            </a>
          ))}

          <a
            href="#contacto"
            className="btn primary navcta"
            onClick={closeMenu}
          >
            Agendar consulta
          </a>

          <a
            href="#portal"
            className="btn primary navcta portal-btn"
            onClick={handlePortalClick}
          >
            Portal clientes
          </a>
        </nav>

        <button
          className="menu"
          type="button"
          aria-label="Abrir menú de navegación"
          aria-controls="mainNav"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>
    </header>
  );
}
