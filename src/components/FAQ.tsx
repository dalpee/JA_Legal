import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: "Metodología",
    question: "¿Cómo se desarrolla la consulta jurídica inicial?",
    answer: "Durante la consulta inicial revisamos los antecedentes fácticos, documentos relevantes y contratos involucrados. Emitimos un diagnóstico de viabilidad jurídica, evaluamos los riesgos, tiempos procesales estimados y le planteamos una estrategia clara con las opciones más favorables.",
  },
  {
    category: "Honorarios",
    question: "¿Cómo se estructuran los honorarios profesionales?",
    answer: "Nuestros honorarios se fijan con base en las tarifas orientadoras del Colegio de Abogados de Colombia y la complejidad del caso. Siempre suscribimos un Contrato de Prestación de Servicios Profesionales por escrito que especifica el valor exacto, la forma de pago (fija, cuotas contra hitos procesales o cuota litis de éxito) y los gastos administrativos.",
  },
  {
    category: "Portal Digital",
    question: "¿Cómo funciona el seguimiento de mi caso en el Portal de Clientes?",
    answer: "Al contratar con la firma, se le asigna un usuario y contraseña privados para ingresar a nuestro Portal Digital. Desde allí puede ver en cualquier momento el porcentaje de avance, descargar memoriales radicados y providencias de los juzgados, consultar el calendario de audiencias y revisar sus recibos de pago.",
  },
  {
    category: "Cobertura",
    question: "¿Tienen cobertura para procesos fuera de Bogotá?",
    answer: "Sí. Contamos con sedes y presencia en Bogotá, Barranquilla y Medellín, y atendemos litigios y trámites notariales en todo el territorio colombiano gracias al expediente digital de la Rama Judicial y las audiencias virtuales por Microsoft Teams / Lifesize.",
  },
  {
    category: "Confidencialidad",
    question: "¿Mi información y documentos están seguros con la firma?",
    answer: "Totalmente. Toda la información entregada está blindada por el Secreto Profesional (Art. 74 de la Constitución Política) y la Ley 1581 de 2012 de Protección de Datos Personales (Habeas Data). Además, nuestro portal cuenta con cifrado SSL de 256 bits y sellos de integridad criptográfica SHA-256.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="section faq-section">
      <div className="container">
        <div className="heading fade-in-up">
          <div>
            <span className="label">Preguntas Frecuentes</span>
            <h2>Claridad & Transparencia Jurídica</h2>
            <p className="gold-text">Resolvemos sus dudas antes de iniciar</p>
          </div>
          <p className="heading-sub">
            Conozca nuestra forma de trabajar, políticas de cobro y garantías procesales para su tranquilidad.
          </p>
        </div>

        <div className="faq-list fade-in-up">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div className={`faq-card ${isOpen ? "open" : ""}`} key={faq.question}>
                <button
                  type="button"
                  className="faq-question"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                >
                  <span className="faq-q-text">
                    <span className="faq-num">0{index + 1}</span>
                    {faq.question}
                  </span>
                  <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
