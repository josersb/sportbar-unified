import styles from "./Header.module.css";
import ThemeToggle from "./ThemeToggle";

const Header = () => {
  return (
    <header className={styles.header} role="banner">
      <div className={styles.container}>
        <img
          src="/logos/logoBetwarriorCompleto.PNG"
          alt="Logo BetWarrior"
          className={styles.logo}
        />
        <h1 className={styles.title}>
          Sportbar <span>Fuentes de señales AV</span>
        </h1>
        <div className={styles.headerRight}>
          <ThemeToggle />
          <img
            src="/logos/HipodromoPalermo.jpg"
            alt="Logo Hipódromo Palermo"
            className={styles.palermoLogo}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
