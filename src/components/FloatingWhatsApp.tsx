import { firm } from "../data/site";

export function FloatingWhatsApp() {
  const number = firm.phoneHref.replace(/\D/g, "");
  return (
    <a
      href={`https://wa.me/${number}?text=Hola,%20quisiera%20solicitar%20asesor%C3%ADa%20jur%C3%ADdica%20con%20J%26A%20Legal`}
      target="_blank"
      rel="noreferrer"
      className="whatsapp"
      aria-label="Contactar por WhatsApp"
      title="Contactar directamente por WhatsApp"
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      <span>WhatsApp</span>
    </a>
  );
}
