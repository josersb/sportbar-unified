import { NavLink } from "react-router-dom";
import styles from "./Nav.module.css";

const linkClass = ({ isActive }) =>
  isActive ? `${styles.linkItem} ${styles.active}` : styles.linkItem;

const linkAria = ({ isActive }) => isActive ? "page" : undefined;

const Nav = () => {
  return (
    <nav>
      <div className={styles.container}>
        <ul className={styles.ulContainer}>
          <NavLink to="/inicio" className={linkClass} aria-current={linkAria}>
            Inicio
          </NavLink>
          <NavLink to="/matrizvideo" className={linkClass} aria-current={linkAria}>
            Matriz Video
          </NavLink>
          <NavLink to="/audio" className={linkClass} aria-current={linkAria}>
            Audio
          </NavLink>
          <NavLink to="/canales" className={linkClass} aria-current={linkAria}>
            Canales
          </NavLink>
          <NavLink to="/arranger" className={linkClass} aria-current={linkAria}>
            Links-Arranger
          </NavLink>
        </ul>
        <div className={styles.ulContainer}>
          <NavLink to="/soporte" className={linkClass} aria-current={linkAria}>
            Soporte
          </NavLink>
        </div>
      </div>
    </nav>
  );
};

export default Nav;
