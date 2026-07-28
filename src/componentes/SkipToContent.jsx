import styles from "./SkipToContent.module.css";

function SkipToContent() {
  return (
    <a href="#main-content" className={styles.skipLink}>
      Saltar al contenido principal
    </a>
  );
}

export default SkipToContent;
