import { type FormEvent, useState } from "react";
import { firm, services } from "../data/site";
import { supabase } from "../lib/supabaseClient";

export function Contact() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");

    const form = new FormData(event.currentTarget);
    const nombre = String(form.get("name") || "");
    const correo = String(form.get("email") || "");
    const telefono = String(form.get("phone") || "");
    const area = String(form.get("area") || "");
    const caso = String(form.get("message") || "");

    const { error } = await supabase.from("contactos_web").insert({
      nombre,
      correo,
      telefono,
      area,
      mensaje: caso,
    });

    setLoading(false);

    if (error) {
      console.error(error);
      setErrorMessage("No pudimos enviar su consulta. Intente nuevamente.");
      return;
    }

    const message = [
      "Hola, quiero solicitar una asesoría jurídica.",
      `Nombre: ${nombre}`,
      `Correo: ${correo}`,
      `Teléfono: ${telefono}`,
      `Área: ${area}`,
      `Caso: ${caso}`,
    ].join("\n");
    const whatsappNumber = firm.phoneHref.replace(/\D/g, "");

    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`,
      "_blank",
    );

    event.currentTarget.reset();
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
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Enviando..." : "Enviar por WhatsApp"}
            </button>
            {errorMessage && <p className="form-error">{errorMessage}</p>}
            <p className="note">
              Al enviar, se abrirá WhatsApp con la información diligenciada.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
