import styles from "./Header.module.css";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  return (
    <header>
      <div className={styles.container}>
        <img src="/logos/logoBetwarriorCompleto.PNG" alt="betwarrior" />
        <h1 className={styles.title}>
          Sportbar <span>Fuentes de señales AV</span>{" "}
        </h1>
        <div className={styles.headerRight}>
          <ThemeToggle />
          <img src="/logos/HipodromoPalermo.jpg" alt="Hipódromo Palermo" style={{ height: 90 }} />
        </div>
      </div>
    </header>
  );
};

export default Header;
