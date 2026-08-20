import { type FormEvent } from "react";
import { firm, services } from "../data/site";

export function Contact() {
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
      `https://wa.me/${firm.phoneHref}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  return (
    <section id="contacto" className="section contact-section">
      <div className="container">
        <div className="contactgrid fade-in-up">
          <div>
            <span className="label">Contacto</span>
            <h2>Conversemos sobre su caso</h2>
            <p className="contactintro">
              Complete el formulario y nos pondremos en contacto para conocer su
              situación.
            </p>
            <p className="contactintro">
              <strong>Su caso merece una estrategia clara.</strong> Reciba una
              orientación inicial y conozca las opciones jurídicas disponibles.
            </p>
            <div className="details">
              <p>
                <strong>Ciudad:</strong> {firm.cities} · Atención nacional
              </p>
              <p>
                <strong>Correo:</strong>{" "}
                <a href={`mailto:${firm.email}`}>{firm.email}</a>
              </p>
              <p>
                <strong>WhatsApp:</strong>{" "}
                <a href={`tel:${firm.phoneHref}`}>{firm.phone}</a>
              </p>
            </div>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <label>
              Nombre completo
              <input
                name="name"
                type="text"
                placeholder="Escriba su nombre"
                required
              />
            </label>
            <label>
              Correo electrónico
              <input
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                required
              />
            </label>
            <label>
              Teléfono
              <input name="phone" type="tel" placeholder="+57" />
            </label>
            <label>
              Área de consulta
              <select name="area">
                {services.map((service) => (
                  <option key={service.title}>{service.title}</option>
                ))}
                <option>Otro asunto</option>
              </select>
            </label>
            <label className="wide">
              Cuéntenos brevemente su caso
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
  );
}
