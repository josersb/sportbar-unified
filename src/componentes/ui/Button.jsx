import styles from "./Button.module.css";
import PropTypes from "prop-types";

/**
 * Shared token-driven Button component.
 *
 * Class composition via CSS Modules: `.btn` + `.btn--{variant}` +
 * `.btn--{size}` + state classes (selected/loading/disabled/icon).
 * All colors and spacing come from `var(--btn-*)` tokens in tokens.css.
 * Theme is read passively through CSS custom properties — no JS theme API.
 *
 * @param {{
 *   variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline',
 *   size?: 'sm' | 'md' | 'lg',
 *   selected?: boolean,
 *   loading?: boolean,
 *   disabled?: boolean,
 *   icon?: React.ReactNode,
 *   as?: 'button' | 'input',
 *   className?: string,
 *   type?: string,
 *   value?: string,
 *   children?: React.ReactNode,
 *   onClick?: (e: React.SyntheticEvent) => void,
 *   'aria-label'?: string,
 *   [key: string]: any,
 * }} props
 */
const Button = ({
  variant = "primary",
  size = "md",
  selected = false,
  loading = false,
  disabled = false,
  icon = null,
  as = "button",
  className = "",
  type = "button",
  value = "",
  children,
  onClick,
  "aria-label": ariaLabel,
  ...rest
}) => {
  const isDisabled = disabled || loading;
  const hasVisibleText = children != null && children !== "";
  // A11Y-07: icon-only loading buttons announce the loading state
  const computedAriaLabel =
    ariaLabel || (loading && icon && !hasVisibleText ? "Cargando..." : undefined);

  const classNames = [
    styles.btn,
    styles[`btn--${variant}`],
    styles[`btn--${size}`],
    selected ? styles["btn--selected"] : "",
    loading ? styles["btn--loading"] : "",
    isDisabled ? styles["btn--disabled"] : "",
    icon ? styles["btn--icon"] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // BTN-10/A11Y-09: loading/disabled blocks onClick — guard above native disabled
  const handleClick = isDisabled ? undefined : onClick;

  const content = (
    <>
      {icon && (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      )}
      {loading && <Spinner />}
      {children}
    </>
  );

  if (as === "input") {
    return (
      <input
        type="submit"
        value={value || (typeof children === "string" ? children : "")}
        className={classNames}
        disabled={isDisabled}
        aria-busy={loading ? "true" : undefined}
        aria-disabled={isDisabled ? "true" : undefined}
        aria-label={computedAriaLabel}
        onClick={handleClick}
        {...rest}
      />
    );
  }

  return (
    <button
      type={type}
      className={classNames}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      aria-disabled={isDisabled ? "true" : undefined}
      aria-label={computedAriaLabel}
      onClick={handleClick}
      {...rest}
    >
      {content}
    </button>
  );
};

Button.displayName = "Button";

Button.propTypes = {
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "ghost", "outline"]),
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  selected: PropTypes.bool,
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  icon: PropTypes.node,
  as: PropTypes.oneOf(["button", "input"]),
  className: PropTypes.string,
  type: PropTypes.string,
  value: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
  "aria-label": PropTypes.string,
};

/** Internal 24x24 animated SVG spinner — no external icon dependency (BTN-03). */
const Spinner = () => (
  <svg
    className={styles.spinner}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle
      className={styles.spinnerTrack}
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className={styles.spinnerHead}
      fill="currentColor"
      d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

export default Button;
