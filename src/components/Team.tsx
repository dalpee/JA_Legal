import marlonPhoto from "../assets/marlon-jimenez.jpeg";
import sebastianPhoto from "../assets/sebastian-ariza.jpeg";
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
          <p className="heading-sub">Experiencia jurídica, visión estratégica y atención directa.</p>
        </div>

        <div className="team fade-in-up">
          {team.map((member) => {
            const photo = memberPhotos[member.name];

            return (
              <article className="person" key={member.name}>
                <div className="person-avatar-wrap">
                  {photo ? (
                    <img
                      src={photo}
                      alt={member.name}
                      className="personimg"
                      onError={(e) => {
                        // Fallback to stylized initials if image fails
                        e.currentTarget.style.display = "none";
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector(".person-fallback");
                          if (fallback) (fallback as HTMLElement).style.display = "flex";
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="personimg person-fallback"
                    style={{ display: photo ? "none" : "flex" }}
                    aria-label={`Fotografía de ${member.name}`}
                  >
                    <span>{member.initials}</span>
                  </div>
                </div>

                <div className="person-info">
                  <h3>{member.name}</h3>
                  <p className="role">{member.role}</p>
                  <p className="bio">{member.bio}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
