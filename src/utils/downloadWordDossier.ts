import { firm } from "../data/site";

export function downloadWordDossier() {
  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Dossier Corporativo - Jiménez & Ariza Asociados</title>
      <style>
        @page {
          size: 8.5in 11.0in;
          margin: 1.0in 1.0in 1.0in 1.0in;
        }
        body {
          font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.5;
          color: #1a202c;
          background-color: #ffffff;
        }
        h1, h2, h3, h4 {
          font-family: 'Georgia', 'Times New Roman', serif;
          color: #0f2744;
          margin-top: 18pt;
          margin-bottom: 6pt;
        }
        h1 {
          font-size: 24pt;
          border-bottom: 2pt solid #b38234;
          padding-bottom: 8pt;
          color: #0f2744;
        }
        h2 {
          font-size: 16pt;
          color: #b38234;
          border-bottom: 1pt solid #e2e8f0;
          padding-bottom: 4pt;
        }
        h3 {
          font-size: 13pt;
          color: #0f2744;
        }
        p {
          margin-top: 0;
          margin-bottom: 10pt;
          text-align: justify;
        }
        .header-box {
          background-color: #0c1527;
          color: #ffffff;
          padding: 24pt;
          text-align: center;
          margin-bottom: 24pt;
          border-radius: 4pt;
        }
        .header-box h1 {
          color: #d9b56a;
          border: none;
          margin: 0;
          font-size: 26pt;
        }
        .header-box p {
          color: #cbd5e1;
          margin: 6pt 0 0 0;
          text-align: center;
          font-size: 12pt;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12pt;
          margin-bottom: 18pt;
          font-size: 10pt;
        }
        th, td {
          border: 1pt solid #cbd5e1;
          padding: 8pt 10pt;
          text-align: left;
        }
        th {
          background-color: #0f2744;
          color: #ffffff;
          font-weight: bold;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .badge {
          display: inline-block;
          background-color: #f1f5f9;
          color: #0f2744;
          border: 1pt solid #b38234;
          padding: 2pt 6pt;
          font-size: 9pt;
          font-weight: bold;
          border-radius: 3pt;
        }
        .feature-box {
          background-color: #f8fafc;
          border-left: 4pt solid #b38234;
          padding: 10pt 14pt;
          margin-bottom: 12pt;
        }
        .footer-note {
          margin-top: 30pt;
          border-top: 1pt solid #cbd5e1;
          padding-top: 10pt;
          font-size: 9pt;
          color: #64748b;
          text-align: center;
        }
      </style>
    </head>
    <body>

      <div class="header-box">
        <h1>JIMÉNEZ & ARIZA ASOCIADOS</h1>
        <p>Estrategia Jurídica y Soluciones Claras para Personas y Empresas</p>
        <p style="font-size: 10pt; color: #94a3b8; margin-top: 8pt;">NIT: 901.482.119-4 · Cobertura Nacional: Bogotá · Barranquilla · Medellín</p>
      </div>

      <h1>DOSSIER CORPORATIVO & PROPUESTA DE VALOR</h1>
      <p><strong>Fecha de Emisión:</strong> Octubre de 2026</p>
      <p><strong>Destinatario:</strong> Clientes Corporativos, Personas Naturales y Entidades Aliadas</p>

      <h2>1. Presentación Institucional</h2>
      <p>
        <strong>Jiménez & Ariza Asociados</strong> es una firma jurídica colombiana que combina el rigor del litigio tradicional con la agilidad y transparencia de las herramientas tecnológicas modernas (LegalTech). Nuestro propósito fundamental es proteger el patrimonio, la estabilidad y los derechos de nuestros representados a través de estrategias preventivas y contenciosas de alta efectividad.
      </p>
      <p>
        Operamos bajo un modelo de <em>comunicación directa y sin intermediarios</em>, garantizando que cada cliente conozca en tiempo real el estado, los términos procesales y las decisiones clave de su caso.
      </p>

      <h2>2. Portafolio de Áreas de Práctica Jurídica</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 25%;">Área</th>
            <th style="width: 45%;">Alcance de los Servicios</th>
            <th style="width: 30%;">Impacto para el Cliente</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Derecho Civil & Procesal</strong></td>
            <td>Restitución de inmuebles, responsabilidad civil contractual y extracontractual, ejecución de títulos valores y procesos divisorios.</td>
            <td>Recuperación efectiva de activos, saneamiento de inmuebles e indemnizaciones justas.</td>
          </tr>
          <tr>
            <td><strong>Derecho Comercial & Societario</strong></td>
            <td>Estructuración de contratos mercantiles, fusiones, liquidación de sociedades, gobierno corporativo y cobro de cartera.</td>
            <td>Blindaje legal frente a contingencias y optimización de relaciones contractuales.</td>
          </tr>
          <tr>
            <td><strong>Derecho Laboral & Seguridad Social</strong></td>
            <td>Defensa patronal, liquidación de acreencias laborales, auditoría de nómina, régimen pensional y fueros de estabilidad reforzada.</td>
            <td>Prevención de demandas laborales ruinosas y conciliaciones eficaces.</td>
          </tr>
          <tr>
            <td><strong>Derecho de Familia & Sucesiones</strong></td>
            <td>Liquidación de sociedades conyugales, partición notarial y judicial de herencias, capitulaciones y alimentos.</td>
            <td>Trámite sereno, respetuoso y con estricta equidad patrimonial.</td>
          </tr>
          <tr>
            <td><strong>Derecho Inmobiliario</strong></td>
            <td>Estudios de títulos, redacción de minutas de compraventa, saneamiento catastral y representación en asambleas de copropiedad.</td>
            <td>Seguridad jurídica absoluta en inversiones y transacciones de finca raíz.</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Innovación Tecnológica: Portal Digital de Clientes 24/7</h2>
      <p>
        A diferencia de los bufetes tradicionales donde el cliente depende de llamadas esporádicas para enterarse de su caso, Jiménez & Ariza Asociados ofrece una <strong>plataforma digital privada</strong> incluida sin costo adicional:
      </p>

      <div class="feature-box">
        <h3>A. Expediente Digital Completo</h3>
        <p>
          Acceso inmediato a la totalidad de autos judiciales, demandas radicadas, memoriales de pruebas y sentencias en formato PDF de alta resolución, certificados con firma electrónica.
        </p>
      </div>

      <div class="feature-box">
        <h3>B. Calendario & Alertas de Audiencias</h3>
        <p>
          Cronograma sincronizado con fechas exactas de vencimiento de términos, diligencias de inspección judicial y audiencias ante juzgados y tribunales con enlaces a salas virtuales.
        </p>
      </div>

      <div class="feature-box">
        <h3>C. Cuaderno de Actuaciones en Tiempo Real</h3>
        <p>
          Línea de tiempo cronológica con cada providencia emitida por el despacho judicial, explicada en lenguaje claro y accesible por el abogado titular.
        </p>
      </div>

      <div class="feature-box">
        <h3>D. Gestión Económica & Recibos de Caja</h3>
        <p>
          Transparencia financiera absoluta: desglose de honorarios pactados, abonos realizados, saldos pendientes y descarga de comprobantes de pago oficiales membretados.
        </p>
      </div>

      <div class="feature-box">
        <h3>E. Liquidador Judicial Automatizado (LegalTech)</h3>
        <p>
          Algoritmo integrado que calcula intereses moratorios con base en la tasa bancaria corriente certificada por la Superintendencia Financiera de Colombia e indexación monetaria por inflación IPC (DANE).
        </p>
      </div>

      <h2>4. Estructura de Honorarios y Transparencia Financiera</h2>
      <p>
        Nuestra política de honorarios se rige por las tarifas del Colegio de Abogados de Colombia y se pacta previamente mediante contrato de prestación de servicios profesionales por escrito:
      </p>
      <ul>
        <li><strong>Etapa Prejudicial / Conciliación:</strong> Honorario fijo preferencial orientado a resolver el conflicto sin dilaciones procesales.</li>
        <li><strong>Litigio Ordinario:</strong> Esquema mixto (anticipo inicial + cuotas fijadas contra hitos procesales claros + cuota litis de éxito).</li>
        <li><strong>Iguala Jurídica Mensual para Empresas:</strong> Tarifa plana mensual que cubre asesoría preventiva ilimitada, revisión contractual y acompañamiento laboral continuo.</li>
      </ul>

      <h2>5. Seguridad de la Información & Cumplimiento Legal</h2>
      <p>
        La información compartida con nuestra firma goza de triple protección:
      </p>
      <ol>
        <li><strong>Reserva Legal y Secreto Profesional:</strong> Amparado por el artículo 74 de la Constitución Política de Colombia y el Código Disciplinario del Abogado.</li>
        <li><strong>Ley 1581 de 2012 (Habeas Data):</strong> Tratamiento estricto de datos personales sensibles con servidores cifrados bajo estándar bancario SSL de 256 bits.</li>
        <li><strong>Ley 527 de 1999 (Comercio Electrónico y Mensajes de Datos):</strong> Trazabilidad inmutable de expedientes y comprobantes con hashes criptográficos de verificación.</li>
      </ol>

      <h2>6. Equipo Directivo y Contacto Oficial</h2>
      <table>
        <thead>
          <tr>
            <th>Abogado Socio</th>
            <th>Especialidad Principal</th>
            <th>Registro Profesional</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Marlon David Jiménez Padilla</strong></td>
            <td>Litigio Civil, Procesal, Recuperación de Cartera y Seguros</td>
            <td>T.P. Vigente CSJ · Universidad Libre</td>
          </tr>
          <tr>
            <td><strong>Sebastián Elías Ariza Fontalvo</strong></td>
            <td>Derecho Corporativo, Contractual, Comercial y Societario</td>
            <td>T.P. Vigente CSJ · Universidad del Norte</td>
          </tr>
        </tbody>
      </table>

      <div style="background-color: #f1f5f9; padding: 14pt; border-radius: 4pt; margin-top: 20pt;">
        <h3 style="margin-top: 0; color: #0f2744;">Canales de Atención Directa</h3>
        <p><strong>Dirección:</strong> ${firm.address}</p>
        <p><strong>Teléfono / WhatsApp Oficial:</strong> ${firm.phone}</p>
        <p><strong>Correo Electrónico:</strong> ${firm.email}</p>
        <p><strong>Sedes:</strong> ${firm.cities} · Atención virtual y presencial en todo el territorio colombiano.</p>
      </div>

      <div class="footer-note">
        Documento Oficial expedido por el Departamento Jurídico y de Sistemas de Jiménez & Ariza Asociados.<br>
        Prohibida su reproducción sin autorización expresa. Bogotá D.C., Colombia.
      </div>

    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", content], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Dossier_Corporativo_JA_Legal_${new Date().getFullYear()}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
