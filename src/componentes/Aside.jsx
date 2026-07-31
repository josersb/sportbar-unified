import styles from "./Aside.module.css";
import DecosStatus from "./DecosStatus";
import AudioStatus from "./AudioStatus";
import ZonasFueraStatus from "./ZonasFueraStatus";
import VideoMatrix from "./VideoMatrix";

const Aside = () => {
  return (
    <aside className={styles.asideContainer}>
      <DecosStatus />
      <AudioStatus />
      <VideoMatrix />
      <ZonasFueraStatus />
    </aside>
  );
};

export default Aside;
