import "./Arranger.css";

const Arranger = () => {
  return (
    <main>
      <div className="arranger-main-container">
        <h3 className="arranger-main-titulo">Links a ventanas de software Arranger IPEX5000</h3>
        <ul className="arranger-main-grillaFavoritos">
          <a href="http://192.168.2.254/#/status" target="_blank" rel="noopener noreferrer" className="arranger-link">
            Estados de Fuentes y TVs
          </a>
          <a href="http://192.168.2.254/#/matrix" target="_blank" rel="noopener noreferrer" className="arranger-link">
            Matriz de Audio Video
          </a>
          <a href="http://192.168.2.254/#/tools/previews" className="arranger-link" target="_blank" rel="noopener noreferrer">
            Preview de Fuentes de Señal
          </a>
          <a href="http://192.168.2.254/#/device-settings" className="arranger-link" target="_blank" rel="noopener noreferrer">
            Ajustes de Dispositivos
          </a>
          <a href="http://192.168.2.254/#/tools" className="arranger-link" target="_blank" rel="noopener noreferrer">
            Herramientas
          </a>
        </ul>
      </div>
    </main>
  );
};

export default Arranger;
