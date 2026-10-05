import { type FormEvent, useState } from "react";
import { firm, services } from "../data/site";
import { supabase } from "../lib/supabaseClient";

export function Contact() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setSentSuccess(false);

    const form = new FormData(event.currentTarget);
    const nombre = String(form.get("name") || "");
    const correo = String(form.get("email") || "");
    const telefono = String(form.get("phone") || "");
    const area = String(form.get("area") || "");
    const caso = String(form.get("message") || "");

    try {
      const { error } = await supabase.from("contactos_web").insert({
        nombre,
        correo,
        telefono,
        area,
        mensaje: caso,
      });

      if (error) {
        console.warn("Error guardando en Supabase, abriendo WhatsApp:", error);
      }
    } catch (err) {
      console.warn("Envío directo:", err);
    }

    setLoading(false);
    setSentSuccess(true);

    const message = [
      "Hola, quiero solicitar una asesoría jurídica con J&A Legal.",
      `Nombre: ${nombre}`,
      `Correo: ${correo}`,
      `Teléfono: ${telefono}`,
      `Área de consulta: ${area}`,
      `Detalle del caso: ${caso}`,
    ].join("\n");

    const whatsappNumber = firm.phoneHref.replace(/\D/g, "");

    window.open(
      `https://wa.me/${573122149562}}?text=${encodeURIComponent(message)}`,
      "_blank",
    );

    event.currentTarget.reset();
  };

  return (
    <section id="contacto" className="section contact-section">
      <div className="container">
        <div className="contactgrid fade-in-up">
          <div className="contact-info">
            <span className="label">Contacto</span>
            <h2>Conversemos sobre su caso</h2>
            <p className="contactintro">
              Complete el formulario y nos pondremos en contacto para conocer su
              situación detalladamente.
            </p>
            <p className="contactintro highlight-quote">
              <strong>Su caso merece una estrategia clara.</strong> Reciba una
              orientación inicial y conozca las opciones jurídicas viables.
            </p>
            <div className="details">
              <p>
                <strong>Sedes:</strong> {firm.cities} · Cobertura nacional
              </p>
              <p>
                <strong>Dirección:</strong> {firm.address}
              </p>
              <p>
                <strong>Correo:</strong>{" "}
                <a href={`mailto:${firm.email}`}>{firm.email}</a>
              </p>
              <p>
                <strong>WhatsApp / Tel:</strong>{" "}
                <a href={`https://wa.me/${firm.phoneHref.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                  {firm.phone}
                </a>
              </p>
            </div>
          </div>

          <form className="form" onSubmit={handleSubmit}>
            <label>
              Nombre completo *
              <input
                name="name"
                type="text"
                placeholder="Escriba su nombre y apellido"
                required
              />
            </label>
            <label>
              Correo electrónico *
              <input
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                required
              />
            </label>
            <label>
              Teléfono de contacto
              <input name="phone" type="tel" placeholder="+57 300 000 0000" />
            </label>
            <label>
              Área de consulta jurídica
              <select name="area" defaultValue={services[0]?.title}>
                {services.map((service) => (
                  <option key={service.title} value={service.title}>
                    {service.title}
                  </option>
                ))}
                <option value="Otro asunto jurídico">Otro asunto o consulta general</option>
              </select>
            </label>
            <label className="wide">
              Cuéntenos brevemente su situación o pretensión
              <textarea
                name="message"
                rows={4}
                placeholder="Describa brevemente los hechos o el problema jurídico..."
                required
              />
            </label>
            <button type="submit" className="btn primary submit-btn" disabled={loading}>
              {loading ? "Preparando consulta..." : "Enviar por WhatsApp y Contactar"}
            </button>
            {sentSuccess && (
              <p className="form-success">
                ✓ Su consulta ha sido canalizada por WhatsApp. ¡En breve nos comunicaremos!
              </p>
            )}
            {errorMessage && <p className="form-error">{errorMessage}</p>}
            <p className="note">
              Al enviar, se abrirá WhatsApp con los datos de su consulta para atención inmediata.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
