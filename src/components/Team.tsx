import marlonPhoto from "../assets/marlon-jimenez.jpg";
import sebastianPhoto from "../assets/sebastian-ariza.jpg";
import { team } from "../data/site";

const memberPhotos: Record<string, string> = {
  "Marlon David Jiménez Padilla": marlonPhoto,
  "Sebastián Elías Ariza Fontalvo": sebastianPhoto,
};

export function Team() {
  return (
    <section id="equipo" className="section">
      <div className="container">
        <div className="heading fade-in-up">
          <div>
            <span className="label">Equipo</span>
            <h2>Nuestro equipo</h2>
            <p className="gold-text">Abogados comprometidos con cada caso</p>
          </div>
          <p>Experiencia jurídica, visión estratégica y atención directa.</p>
        </div>

        <div className="team fade-in-up">
          {team.map((member) => {
            const photo = memberPhotos[member.name];

            return (
              <article className="person" key={member.name}>
                {photo ? (
                  <img
                    src={photo}
                    alt={member.name}
                    className="personimg"
                  />
                ) : (
                  <div
                    className="personimg"
                    aria-label={`Fotografía pendiente de ${member.name}`}
                  >
                    {member.initials}
                  </div>
                )}

                <div>
                  <h3>{member.name}</h3>
                  <p className="role">{member.role}</p>
                  <p>{member.bio}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}