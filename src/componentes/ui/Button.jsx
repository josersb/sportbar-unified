import styles from "./Button.module.css";

/**
 * Shared Button component with variant support.
 *
 * @param {{ variant?: 'primary' | 'secondary' | 'danger', className?: string, children: React.ReactNode, [key: string]: any }} props
 */
const Button = ({ variant = "primary", className = "", children, ...rest }) => {
  const classNames = [styles.btn, styles[`btn--${variant}`], className].filter(Boolean).join(" ");
  return (
    <button className={classNames} {...rest}>
      {children}
    </button>
  );
};

export default Button;
