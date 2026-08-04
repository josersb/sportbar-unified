import { useRef, useContext, useState } from "react";
import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import { CANALES_FAVORITOS } from "../data/canalesFavoritos";
import { sendChannelDigits } from "../api/arrangerApi";
import "./Toast.css";
import { useToast } from "./Toast";
import PageContainer from "./ui/PageContainer";
import Button from "./ui/Button";
import styles from "./Canales.module.css";

const Canales = () => {
  const { estado, handleChangeEstadoDecos, handleUpdateDispositivo } = useContext(ContextoUser);

  const decos = estado.decos;
  const favoritos = estado.favoritos;
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const selectRef = useRef();
  const inputRef = useRef();

  const handleFavorito = (e) => {
    inputRef.current.value = e.currentTarget.dataset.canal;
  };

  const submitCanal = async (e) => {
    try {
      e.preventDefault();
      setLoading(true);
      const canal = inputRef.current.value;
      const esUnCanalFavorito = favoritos.filter((x) => x == canal).length;
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
        toast.success(`Canal ${canal} enviado a ${selectedDeco}`);
      } else {
        inputRef.current.value = "";
        inputRef.current.placeholder = "numero canal no valido";
      }
    } catch {
      toast.error("Error al comunicar con el Arranger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <PageContainer>
        <h3 className={styles.titulo}>Ajuste de canales - canales Favoritos</h3>
        <div className={styles.form}>
          <form onSubmit={submitCanal}>
            <select name="nombreDeco" ref={selectRef} className={styles.formSelect} required>
              <option value="">--Seleccione Deco--</option>
              {getByCapability('channelControl').map(d => (
                <option key={d.id} value={d.id}>{d.id.replace('DTV', 'DTV ')}</option>
              ))}
            </select>
            <label htmlFor="canalDeco" className={styles.formLabel}> Canal </label>
            <input
              type="number"
              id="canalDeco"
              name="canalDeco"
              placeholder="numero a ingresar"
              ref={inputRef}
              className={styles.formInput}
              required
            />
            <Button
              as="input"
              type="submit"
              variant="primary"
              className={styles.formSubmit}
              value={loading ? "Enviando..." : "Aplicar"}
              loading={loading}
            />
          </form>
        </div>
        <h3 className={styles.titulo}>Canales Favoritos</h3>
        <ul className={styles.grillaFavoritos}>
          {CANALES_FAVORITOS.map((ch) => (
            <li key={ch.canal} className={styles.channelItem}>
              <span className={styles.channelNumber}>{ch.canal}</span>
              <Button
                variant="primary"
                size="sm"
                className={styles.channelBtn}
                icon={ch.img ? <img src={ch.img} alt={ch.nombre} /> : null}
                onClick={handleFavorito}
                data-canal={ch.canal}
                aria-label={`Canal ${ch.canal} — ${ch.nombre}`}
              />
            </li>
          ))}
        </ul>
      </PageContainer>
    </main>
  );
};

export default Canales;
