import { NavLink } from "react-router-dom";
import styles from "./Nav.module.css";

const linkClass = ({ isActive }) =>
  isActive ? `${styles.linkItem} ${styles.active}` : styles.linkItem;

const linkAria = ({ isActive }) => (isActive ? "page" : undefined);

const LINKS = [
  { to: "/inicio", label: "Inicio" },
  { to: "/matrizvideo", label: "Matriz Video" },
  { to: "/audio", label: "Audio" },
  { to: "/canales", label: "Canales" },
  { to: "/arranger", label: "Links-Arranger" },
  { to: "/presets", label: "Presets Guardados" },
];

const Nav = () => {
  return (
    <nav className={styles.nav} aria-label="Navegación principal">
      <ul className={styles.list} role="list">
        {LINKS.map((link) => (
          <li key={link.to} className={styles.listItem}>
            <NavLink
              to={link.to}
              className={linkClass}
              aria-current={linkAria}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
        <li className={`${styles.listItem} ${styles.separator}`}>
          <NavLink to="/soporte" className={linkClass} aria-current={linkAria}>
            Soporte
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Nav;
