import { useState } from "react";
import logo from "../assets/logoempresa.png";
import { navigation } from "../data/site";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="container navwrap">
        <a href="#inicio" onClick={closeMenu} className="brand">
          <img src={logo} alt="Jiménez & Ariza Asociados" className="logo" />
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

          <a href="/portal" className="btn primary navcta" onClick={closeMenu}>
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
          ☰
        </button>
      </div>
    </header>
  );
}
