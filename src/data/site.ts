export interface NavigationItem {
  label: string;
  href: string;
}

export interface ServiceItem {
  number: string;
  title: string;
  description: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  initials: string;
}

export interface FirmInfo {
  name: string;
  tagline: string;
  email: string;
  phone: string;
  phoneHref: string;
  cities: string;
  address: string;
}

export const navigation: NavigationItem[] = [
  { label: "La firma", href: "#quienes-somos" },
  { label: "Servicios", href: "#servicios" },
  { label: "Equipo", href: "#equipo" },
  { label: "Contacto", href: "#contacto" },
];

export const services: ServiceItem[] = [
  {
    number: "01",
    title: "Derecho Civil y Contratos",
    description:
      "Asesoría y representación en litigios contractuales, restitución de inmuebles, responsabilidad civil y estructuración de acuerdos comerciales y patrimoniales.",
  },
  {
    number: "02",
    title: "Derecho Comercial y Societario",
    description:
      "Constitución de sociedades, gobierno corporativo, cobro ejecutivo de títulos valores, insolvencia y acompañamiento jurídico continuo a empresas.",
  },
  {
    number: "03",
    title: "Derecho Laboral y Seguridad Social",
    description:
      "Defensa patronal y representación de trabajadores en despidos injustificados, liquidación de prestaciones, fueros de estabilidad y auditorías laborales preventivas.",
  },
  {
    number: "04",
    title: "Derecho Inmobiliario y Urbano",
    description:
      "Estudio de títulos, contratos de compraventa y arrendamiento comercial, saneamiento de predios y trámites notariales de alta complejidad.",
  },
  {
    number: "05",
    title: "Derecho de Familia y Sucesiones",
    description:
      "Tramitación notarial y judicial de sucesiones de común acuerdo o contenciosas, liquidación de sociedades conyugales y partición patrimonial.",
  },
  {
    number: "06",
    title: "Litigio Estratégico y Arbitraje",
    description:
      "Defensa técnica ante jueces de la República, tribunales de arbitramento y entidades administrativas, con enfoque analítico orientado a resultados.",
  },
];

export const team: TeamMember[] = [
  {
    name: "Marlon David Jimenez Padilla",
    role: "Abogado | Especialista en Derecho de los Negocios",
    bio: "Abogado egresado de la Universidad Libre, especialista en Derecho de los Negocios de la Universidad Externado de Colombia y cofundador de Jimenez & Ariza Asociados.\nCuento con formación en insolvencia de persona natural no comerciante y pequeño comerciante, y conocimientos en economía, contratación y gestión empresarial que me permiten analizar cada asunto desde una perspectiva jurídica y financiera.\nMi práctica se enfoca en insolvencia, derecho comercial, asuntos administrativos, contratos y protección patrimonial.\n Acompaño a personas, emprendedores y empresas en la prevención de conflictos, la negociación de obligaciones y la defensa de sus intereses. Mi experiencia en el sector público complementa mi comprensión de los procedimientos administrativos y de la relación entre los ciudadanos y las entidades del Estado. Creo en una asesoría cercana, clara y personalizada. Mi compromiso es comprender las necesidades de cada cliente, explicar sus alternativas y construir estrategias jurídicas orientadas a soluciones prácticas y decisiones informadas.",
    initials: "MJ",
  },
  {
    name: "Sebastián Elías Ariza Fontalvo",
    role: "Abogado | Especialista en derecho administrativo ",
    bio: "Egresado de la universidad libre con conocimientos sólidos en derecho administrativo, civil, laboral, procesal y constitucional. Me caracterizo por mi capacidad de análisis jurídico, redacción precisa de documentos legales y orientación a la resolución pacífica y eficaz de conflictos. Cuento con formación complementaria en conflictividad social y derecho procesal, así como en conciliación como mecanismo alternativo de solución de conflictos y en procesos contencioso administrativos en sus diferentes medios de control. Soy una persona comprometida, proactiva y en constante aprendizaje, con disposición para asumir nuevos retos en el ámbito jurídico y empresarial.",
    initials: "SA",
  },
];

export const firm: FirmInfo = {
  name: "Jiménez & Ariza Asociados",
  tagline: "Estrategia jurídica y soluciones claras para personas y empresas.",
  email: "contacto@jalegal.com.co",
  phone: "+57 (312) 214-9562",
  phoneHref: "+573122149562",
  cities: "Bogotá · Barranquilla · Medellín",
  address: "Calle 93 # 14-20, Oficina 502, Bogotá D.C.",
};
