import { services } from "../data/site";

export function Services() {
  return (
    <section id="servicios" className="section dark">
      <div className="container">
        <div className="heading fade-in-up">
          <div>
            <span className="label">Servicios</span>
            <h2>Áreas de práctica</h2>
            <p className="gold-text">Servicios jurídicos integrales</p>
          </div>
          <p className="heading-sub">
            Soluciones preventivas, consultivas y litigiosas adaptadas a cada
            cliente con rigurosidad técnica.
          </p>
        </div>

        <div className="services fade-in-up">
          {services.map((service) => (
            <article className="service" key={service.title}>
              <span className="num">{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
