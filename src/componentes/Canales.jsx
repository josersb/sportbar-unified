import { useRef, useContext } from "react";
import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import img_espn from "../imagenes/espn.png";
import img_espn2 from "../imagenes/espn2.png";
import img_espn3 from "../imagenes/espn3.png";
import img_espnextra from "../imagenes/espnextra.png";
import img_espnpremiumHD from "../imagenes/espnpremiumHD.png";
import img_foxsporthd from "../imagenes/foxsporthd.png";
import img_foxsporthd2 from "../imagenes/foxsporthd2.png";
import img_foxsporthd3 from "../imagenes/foxsporthd3.png";
import img_garagetv from "../imagenes/garagetv.png";
import img_golf from "../imagenes/golf.png";
import img_deportv from "../imagenes/deportv.png";
import img_dtvsportshd from "../imagenes/dtvsportshd.png";
import img_dtv2sportshd from "../imagenes/dtv2sportshd.png";
import img_dtv3sportshd from "../imagenes/dtv3sportshd.png";
import img_dtvfight from "../imagenes/dtvfight.png";
import img_nbatv from "../imagenes/nbatv.png";
import img_pxsports from "../imagenes/pxsports.png";
import img_tnt_sports from "../imagenes/tntsports.jpg";
import img_tyc from "../imagenes/tyc.png";
import { sendChannelDigits } from "../api/arrangerApi";
import "./Canales.css";
import "./Toast.css";
import "../elementos/CanalFavorito.css";
import { useToast } from "./Toast";

const Canales = () => {
  const { estado, handleChangeEstadoDecos, handleUpdateDispositivo } = useContext(ContextoUser);

  const decos = estado.decos;
  const favoritos = estado.favoritos;
  const toast = useToast();

  const selectRef = useRef();
  const inputRef = useRef();

  const handleFavorito = (e) => {
    inputRef.current.value = e.target.innerText;
  };

  const submitCanal = async (e) => {
    try {
      e.preventDefault();
      //Verifico que el canal seleccionado sea uno de los canales favoritos
      const canal = inputRef.current.value;
      console.log(canal);
      const esUnCanalFavorito = favoritos.filter((x) => x == canal).length;
      console.log(esUnCanalFavorito);
      if (canal >= 100 && canal <= 2000 && esUnCanalFavorito) {
        const selectedDeco = selectRef.current.value;
        // Update dispositivo state directly
        handleUpdateDispositivo(selectedDeco, { canalActual: canal });
        // Also keep legacy decos array in sync for backward compat
        const decoNumber = parseInt(selectedDeco.replace("DTV", ""), 10);
        const newDecos = decos.map((deco, i) =>
          i === decoNumber - 1 ? { ...deco, canalDeco: canal } : deco
        );
        handleChangeEstadoDecos(newDecos);
        await sendChannelDigits(selectedDeco, canal);
      } else {
        inputRef.current.value = "";
        inputRef.current.placeholder = "numero canal no valido";
      }
    } catch {
      toast.error("Error al comunicar con el Arranger");
    }
  };

  return (
    <main>
      <div className="canales-main-container">
        <h3 className="canales-main-titulo">Ajuste de canales - canales Favoritos</h3>
        <div className="canales-main-form">
          <form onSubmit={submitCanal}>
            <select name="nombreDeco" ref={selectRef} className="canales-form-select" required>
              <option value="">--Seleccione Deco--</option>
              {getByCapability('channelControl').map(d => (
                <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
              ))}
            </select>
            <label htmlFor="canalDeco" className="canales-form-label"> Canal </label>
            <input
              type="number"
              id="canalDeco"
              name="canalDeco"
              placeholder="numero a ingresar"
              ref={inputRef}
              className="canales-form-input"
              required
            />
            <input type="submit" value="Aplicar" className="form-submit" />
          </form>
        </div>
        <h3 className="canales-main-titulo">Canales Favoritos</h3>
        <ul className="canales-main-grillaFavoritos">
          <button className="CanalFavorito" onClick={handleFavorito}>
            <img src={img_tnt_sports} alt="" />
            <h3>1603</h3>
          </button>
          <button className="CanalFavorito" value="1604" onClick={handleFavorito}>
            <img src={img_espnpremiumHD} alt="" />
            <h3>1604</h3>
          </button>
          <button className="CanalFavorito" value="1605" onClick={handleFavorito}>
            <img src={img_foxsporthd} alt="" />
            <h3>1605</h3>
          </button>
          <button className="CanalFavorito" value="1608" onClick={handleFavorito}>
            <img src={img_foxsporthd2} alt="" />
            <h3>1608</h3>
          </button>
          <button className="CanalFavorito" value="1609" onClick={handleFavorito}>
            <img src={img_foxsporthd3} alt="" />
            <h3>1609</h3>
          </button>
          <button className="CanalFavorito" value="1610" onClick={handleFavorito}>
            <img src={img_dtvsportshd} alt="" />
            <h3>1610</h3>
          </button>
          <button className="CanalFavorito" value="1612" onClick={handleFavorito}>
            <img src={img_dtv2sportshd} alt="" />
            <h3>1612</h3>
          </button>
          <button className="CanalFavorito" value="1613" onClick={handleFavorito}>
            <img src={img_dtv3sportshd} alt="" />
            <h3>1613</h3>
          </button>
          <button className="CanalFavorito" value="1614" onClick={handleFavorito}>
            <img src={img_dtv3sportshd} alt="" />
            <h3>1614</h3>
          </button>
          <button className="CanalFavorito" value="1620" onClick={handleFavorito}>
            <img src={img_dtvfight} alt="" />
            <h3>1620</h3>
          </button>
          <button className="CanalFavorito" value="1621" onClick={handleFavorito}>
            <img src={img_espn} alt="" />
            <h3>1621</h3>
          </button>
          <button className="CanalFavorito" value="1622" onClick={handleFavorito}>
            <img src={img_espn2} alt="" />
            <h3>1622</h3>
          </button>
          <button className="CanalFavorito" value="1623" onClick={handleFavorito}>
            <img src={img_espn3} alt="" />
            <h3>1623</h3>
          </button>
          <button className="CanalFavorito" value="1625" onClick={handleFavorito}>
            <img src={img_espnextra} alt="" />
            <h3>1625</h3>
          </button>
          <button className="CanalFavorito" value="1628" onClick={handleFavorito}>
            <img src={img_golf} alt="" />
            <h3>1628</h3>
          </button>
          <button className="CanalFavorito" value="1629" onClick={handleFavorito}>
            <img src={img_tyc} alt="" />
            <h3>1629</h3>
          </button>
          <button className="CanalFavorito" value="1631" onClick={handleFavorito}>
            <img src={img_deportv} alt="" />
            <h3>1631</h3>
          </button>
          <button className="CanalFavorito" value="1639" onClick={handleFavorito}>
            <img src={img_pxsports} alt="" />
            <h3>1639</h3>
          </button>
          <button className="CanalFavorito" value="1644" onClick={handleFavorito}>
            <img src={img_garagetv} alt="" />
            <h3>1644</h3>
          </button>
          <button className="CanalFavorito" value="1677" onClick={handleFavorito}>
            <img src={img_nbatv} alt="" />
            <h3>1677</h3>
          </button>
          <button className="CanalFavorito" value="0000" onClick={handleFavorito}>
            0000
          </button>
        </ul>
      </div>
    </main>
  );
};

export default Canales;
