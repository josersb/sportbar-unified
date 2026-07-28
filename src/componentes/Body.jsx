import { Routes, Route } from "react-router-dom";
import styles from "./Body.module.css";
import Header from "./Header";
import Nav from "./Nav";
import Portada from "./Portada";
import MatrizVideo from "./MatrizVideo";
import Canales from "./Canales";
import Audio from "./Audio";
import Aside from "./Aside";
import Arranger from "./Arranger";
import Soporte from "./Soporte";
import MatrizPreset from "./MatrizPreset";
import SkipToContent from "./SkipToContent";

function Body() {
  return (
    <>
      <SkipToContent />
      <div className={styles.container}>
        <div className={styles.header}><Header /></div>
        <div className={styles.nav}><Nav /></div>
        <div className={styles.aside}><Aside /></div>
        <main className={styles.main} id="main-content">
          <Routes>
            <Route path="/inicio" element={<Portada />} />
            <Route path="/matrizvideo" element={<MatrizVideo />} />
            <Route path="/canales" element={<Canales />} />
            <Route path="/audio" element={<Audio />} />
            <Route path="/arranger" element={<Arranger />} />
            <Route path="/presets" element={<MatrizPreset />} />
            <Route path="/soporte" element={<Soporte />} />
            <Route path="/" element={<Portada />} />
          </Routes>
        </main>
      </div>
    </>
  );
}

export default Body;
