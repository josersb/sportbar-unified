import { useRef, useContext, useState } from "react";
import ContextoUser from "../contexto/Contexto";
import { getByCapability } from "../contexto/dispositivos";
import { CANALES_FAVORITOS, CANAL_ALLOWLIST } from "../data/canalesFavoritos";
import { sendChannelDigits, setChannelIntent, setChannelIntentAck } from "../api/arrangerApi";
import "./Toast.css";
import { useToast } from "./Toast";
import PageContainer from "./ui/PageContainer";
import Button from "./ui/Button";
import styles from "./Canales.module.css";

const Canales = () => {
  const { estado, handleChangeEstadoDecos, handleUpdateDispositivo } = useContext(ContextoUser);

  const decos = estado.decos;
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const selectRef = useRef();
  const inputRef = useRef();

  const handleFavorito = (e) => {
    inputRef.current.value = e.currentTarget.dataset.canal;
  };

  const submitCanal = async (e) => {
    e.preventDefault();
    setLoading(true);
    const canal = inputRef.current.value;
    const selectedDeco = selectRef.current.value;
    const decoNumber = parseInt(selectedDeco.replace("DTV", ""), 10);
    const prevCanal = estado.dispositivos?.[selectedDeco]?.canalActual ?? null;
    // Optimistic local (legacy decos + dispositivos). Se REVIERTE si el intent
    // o el IR fallan: el panel no debe mostrar un cambio que no se implementó.
    const applyLocal = (value) => {
      handleUpdateDispositivo(selectedDeco, { canalActual: value });
      handleChangeEstadoDecos(
        decos.map((deco, i) => (i === decoNumber - 1 ? { ...deco, canalDeco: value } : deco))
      );
    };
    try {
      // CF-1: la validación consume la MISMA allowlist que la grilla
      // (CANALES_FAVORITOS) — un canal de la grilla siempre ejecuta.
      if (!CANAL_ALLOWLIST.has(canal)) {
        // CF-2: rechazo explícito — toast de advertencia, sin reset silencioso.
        toast.warning("canal no válido");
        return;
      }
      applyLocal(canal);

      // WS3 write-through: el server decide ANTES de emitir IR. CD-2: si el
      // canal ya es el vigente CONFIRMADO responde noop y NO se emite IR.
      const intent = await setChannelIntent(selectedDeco, canal);
      if (intent.noop) {
        toast.info("canal ya sintonizado");
        return;
      }
      // CD-3: cambio de canal → feedback inmediato + IR client-side (los
      // dígitos siguen viajando por /api/command, transport client-side).
      toast.info(`cambiando al canal ${canal}`);
      try {
        await sendChannelDigits(selectedDeco, canal);
        // CD-1: ACK del controlador (send ir success) persistido en el server.
        await setChannelIntentAck(selectedDeco, "accepted");
      } catch {
        // CD-4: fallo del controlador → ACK rejected + revert del optimistic.
        await setChannelIntentAck(selectedDeco, "rejected").catch(() => {});
        applyLocal(prevCanal);
        toast.error("error al cambiar canal, volvé a intentar");
      }
    } catch {
      // Fallo del POST de intención (red/429/5xx): el write no se procesó.
      applyLocal(prevCanal);
      toast.error("error al cambiar canal, volvé a intentar");
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
