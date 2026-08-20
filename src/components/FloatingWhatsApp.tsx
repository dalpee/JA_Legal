import { firm } from "../data/site";

export function FloatingWhatsApp() {
  return (
    <a
      href={`https://wa.me/${firm.phoneHref}`}
      target="_blank"
      rel="noreferrer"
      className="whatsapp"
      aria-label="Contactar por WhatsApp"
    >
      WA
    </a>
  );
}
