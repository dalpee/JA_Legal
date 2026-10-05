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
    name: "Marlon David Jiménez Padilla",
    role: "Socio Fundador · Director de Litigios",
    bio: "Abogado especialista en Derecho Procesal y Litigio Civil y Comercial. Con amplia trayectoria en representación ante juzgados de circuito y tribunales.",
    initials: "MJ",
  },
  {
    name: "Sebastián Elías Ariza Fontalvo",
    role: "Socio Fundador · Asuntos Corporativos y Laborales",
    bio: "Abogado enfocado en asesoría corporativa, estructuración contractual y negociación estratégica para pequeñas y medianas empresas nacionales.",
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
