import { useState, type FormEvent } from "react";
import "./App.css";
const heroLogo = "/hero.png";
const services = [
  [
    "01",
    "Derecho administrativo",
    "Actuaciones administrativas, recursos, peticiones, tutelas y defensa frente a entidades públicas.",
  ],
  [
    "02",
    "Derecho de los negocios",
    "Asesoría empresarial, contratos, constitución de sociedades y acompañamiento comercial.",
  ],
  [
    "03",
    "Insolvencia",
    "Negociación de deudas para persona natural no comerciante y pequeño comerciante.",
  ],
  [
    "04",
    "Derecho civil",
    "Procesos de pertenencia, obligaciones, arrendamientos, responsabilidad y recuperación de cartera.",
  ],
  [
    "05",
    "Contratación",
    "Elaboración, revisión y negociación de contratos nacionales e internacionales.",
  ],
  [
    "06",
    "Protección patrimonial",
    "Estructuración societaria, organización familiar y planeación jurídica del patrimonio.",
  ],
  [
    "07",
    "Tránsito y transporte",
    "Defensa frente a comparendos, actuaciones sancionatorias y trámites administrativos.",
  ],
  [
    "08",
    "Propiedad intelectual",
    "Registro de marcas y protección jurídica de activos comerciales e identidad empresarial.",
  ],
];

const team = [
  {
    initials: "MJ",
    name: "Marlon David Jiménez Padilla",
    role: "Socio fundador",
    bio: "Abogado de la Universidad Libre, actualmente cursando la Especialización en Derecho de los Negocios en la Universidad Externado de Colombia. Cuenta con experiencia en derecho administrativo, comercial, contratación, análisis normativo, derecho procesal, insolvencia y gestión documental.",
  },
  {
    initials: "SA",
    name: "Sebastián Elías Ariza Fontalvo",
    role: "Socio fundador",
    bio: "Abogado de la Universidad Libre, con conocimientos sólidos en derecho administrativo, civil, laboral, procesal y constitucional. Se caracteriza por su análisis jurídico, redacción precisa y orientación a la resolución eficaz de conflictos.",
  },
  {
    initials: "PJ",
    name: "Pedro José Jiménez Peroza",
    role: "Consultor",
    bio: "Abogado especialista en Derecho Probatorio y Derecho Laboral, con amplia trayectoria en litigio, asesoría jurídica, derecho público, laboral, probatorio y administrativo.",
  },
  {
    initials: "LP",
    name: "Lucía Karina Padilla Santamaría",
    role: "Consultora",
    bio: "Abogada con especialización y maestría en Derecho Administrativo. Cuenta con amplia experiencia en derechos humanos, defensa penal, conciliación, derecho civil, comercial y mecanismos alternativos de solución de conflictos.",
  },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const message = [
      "Hola, quiero solicitar una asesoría jurídica.",
      `Nombre: ${form.get("name") || ""}`,
      `Correo: ${form.get("email") || ""}`,
      `Teléfono: ${form.get("phone") || ""}`,
      `Área: ${form.get("area") || ""}`,
      `Caso: ${form.get("message") || ""}`,
    ].join("\n");

    window.open(
      `https://wa.me/573122149562?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <>
      <header className="header">
        <div className="container navwrap">
          <a href="#inicio" onClick={closeMenu} className="brand">
            <img
              src={heroLogo}
              alt="Jiménez & Ariza Asociados"
              className="logo"
            />
          </a>

          <nav className={`nav ${menuOpen ? "open" : ""}`} id="mainNav">
            <a href="#quienes-somos" onClick={closeMenu}>
              La firma
            </a>
            <a href="#servicios" onClick={closeMenu}>
              Servicios
            </a>
            <a href="#equipo" onClick={closeMenu}>
              Equipo
            </a>
            <a href="#contacto" onClick={closeMenu}>
              Contacto
            </a>
            <a
              href="#contacto"
              className="btn primary navcta"
              onClick={closeMenu}
            >
              Agendar consulta
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

      <main>
        <section id="inicio" className="hero">
          <div className="container herogrid">
            <div className="hero-copy fade-in-up">
              <span className="eyebrow">Firma jurídica en Colombia</span>
              <h1>
                Estrategia legal con <span>resultados reales</span>
              </h1>
              <p>
                Acompañamos personas, empresas y entidades con soluciones
                jurídicas claras, preventivas y orientadas a proteger sus
                intereses.
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
                Analizamos su situación y le explicamos las alternativas
                jurídicas disponibles.
              </p>
              <p>
                <strong>Atención:</strong> Personalizada ·{" "}
                <strong>Enfoque:</strong> Estratégico ·{" "}
                <strong>Cobertura:</strong> Nacional
              </p>
              <a href="#contacto">Iniciar contacto</a>
            </aside>
          </div>
        </section>

        <section id="quienes-somos" className="section">
          <div className="container split heading fade-in-up">
            <div>
              <span className="label">La firma</span>
              <h2>Quiénes somos</h2>
              <p className="gold-text">
                Una firma cercana, moderna y orientada a soluciones
              </p>
            </div>
            <div className="copy">
              <p>
                Jiménez & Ariza Asociados es una firma jurídica colombiana que
                brinda asesoría, representación y acompañamiento legal a
                personas naturales, empresas y entidades.
              </p>
              <p>
                Trabajamos con rigor, comunicación directa y visión de negocio
                para convertir los problemas jurídicos en decisiones claras y
                acciones concretas.
              </p>
            </div>
          </div>
        </section>

        <section id="servicios" className="section dark">
          <div className="container">
            <div className="heading fade-in-up">
              <div>
                <span className="label">Servicios</span>
                <h2>Áreas de práctica</h2>
                <p className="gold-text">Servicios jurídicos integrales</p>
              </div>
              <p>
                Soluciones preventivas, consultivas y litigiosas adaptadas a
                cada cliente.
              </p>
            </div>

            <div className="services fade-in-up">
              {services.map(([number, title, description]) => (
                <article className="service" key={title}>
                  <span className="num">{number}</span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="equipo" className="section">
          <div className="container">
            <div className="heading fade-in-up">
              <div>
                <span className="label">Equipo</span>
                <h2>Nuestro equipo</h2>
                <p className="gold-text">
                  Abogados comprometidos con cada caso
                </p>
              </div>
              <p>
                Experiencia jurídica, visión estratégica y atención directa.
              </p>
            </div>

            <div className="team fade-in-up">
              {team.map((member) => (
                <article className="person" key={member.name}>
                  <div
                    className="personimg"
                    aria-label={`Fotografía pendiente de ${member.name}`}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <h3>{member.name}</h3>
                    <p className="role">{member.role}</p>
                    <p>{member.bio}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="contacto" className="section contact-section">
          <div className="container">
            <div className="contactgrid fade-in-up">
              <div>
                <span className="label">Contacto</span>
                <h2>Conversemos sobre su caso</h2>
                <p className="contactintro">
                  Complete el formulario y nos pondremos en contacto para
                  conocer su situación.
                </p>
                <p className="contactintro">
                  <strong>Su caso merece una estrategia clara.</strong> Reciba
                  una orientación inicial y conozca las opciones jurídicas
                  disponibles.
                </p>
                <div className="details">
                  <p>
                    <strong>Ciudad:</strong> Bogotá D.C. / Barranquilla ·
                    Atención nacional
                  </p>
                  <p>
                    <strong>Correo:</strong>{" "}
                    <a href="mailto:jimenezarizaasociados@gmail.com">
                      jimenezarizaasociados@gmail.com
                    </a>
                  </p>
                  <p>
                    <strong>WhatsApp:</strong>{" "}
                    <a href="tel:+573122149562">(312) 214-9562</a>
                  </p>
                </div>
              </div>

              <form className="form" onSubmit={handleSubmit}>
                <label>
                  Nombre completo{" "}
                  <input
                    name="name"
                    type="text"
                    placeholder="Escriba su nombre"
                    required
                  />
                </label>
                <label>
                  Correo electrónico{" "}
                  <input
                    name="email"
                    type="email"
                    placeholder="correo@ejemplo.com"
                    required
                  />
                </label>
                <label>
                  Teléfono <input name="phone" type="tel" placeholder="+57" />
                </label>
                <label>
                  Área de consulta
                  <select name="area">
                    {services.map(([, title]) => (
                      <option key={title}>{title}</option>
                    ))}
                    <option>Otro asunto</option>
                  </select>
                </label>
                <label className="wide">
                  Cuéntenos brevemente su caso{" "}
                  <textarea
                    name="message"
                    rows={5}
                    placeholder="Describa su situación"
                  />
                </label>
                <button type="submit" className="btn primary">
                  Enviar por WhatsApp
                </button>
                <p className="note">
                  Al enviar, se abrirá WhatsApp con la información diligenciada.
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footergrid">
            <div>
              <img
                src={heroLogo}
                alt="Jiménez & Ariza Asociados"
                className="footer-logo"
              />
              <p>Estrategia legal con resultados reales.</p>
            </div>
            <div>
              <p>
                <strong>Enlaces</strong>
              </p>
              <a href="#quienes-somos">La firma</a>
              <a href="#servicios">Servicios</a>
              <a href="#equipo">Equipo</a>
              <a href="#contacto">Contacto</a>
            </div>
            <div>
              <p>
                <strong>Contacto</strong>
              </p>
              <a href="mailto:jimenezarizaasociados@gmail.com">
                jimenezarizaasociados@gmail.com
              </a>
              <a href="tel:+573122149562">(312) 214-9562</a>
            </div>
          </div>
          <div className="bottom">
            <span>
              © 2026 Jiménez & Ariza Asociados. Todos los derechos reservados.
            </span>
          </div>
        </div>
      </footer>

      <a
        href="https://wa.me/573122149562"
        target="_blank"
        rel="noreferrer"
        className="whatsapp"
        aria-label="Contactar por WhatsApp"
      >
        WA
      </a>
    </>
  );
}

export default App;
