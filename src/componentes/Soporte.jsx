import "./Soporte.css";

const Soporte = () => {
  return (
    <main>
      <div className="soporte-main-container">
        <h3 className="soporte-main-titulo">Wetech Latam soporte técnico</h3>
        <ul className="soporte-main-grillaFavoritos">
          <a
            href="http://www.wetechlatam.com"
            target="blank"
            className="soporte-link"
            alt="http://www.wetechlatam.com"
          >
            Home Page Wetech Latam
          </a>
          <a
            href="mailto:soporte@wetechar.com"
            target="blank"
            className="soporte-link"
            alt="soporte@wetechar.com"
          >
            Correo electrónico soporte técnico
          </a>
        </ul>
      </div>
    </main>
  );
};

export default Soporte;
