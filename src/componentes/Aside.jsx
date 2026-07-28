import styles from "./Aside.module.css";
import DecosStatus from "./DecosStatus";
import AudioStatus from "./AudioStatus";
import VideoMatrix from "./VideoMatrix";

const Aside = () => {
  return (
    <aside className={styles.asideContainer}>
      <DecosStatus />
      <AudioStatus />
      <VideoMatrix />
    </aside>
  );
};

export default Aside;
