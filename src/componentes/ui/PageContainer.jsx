import styles from "./PageContainer.module.css";

/**
 * Shared page container wrapper.
 * Replaces the duplicated `.X-main-container` pattern across all pages.
 *
 * @param {{ children: React.ReactNode, className?: string, [key: string]: any }} props
 */
const PageContainer = ({ children, className = "", ...rest }) => {
  const classNames = [styles.pageContainer, className].filter(Boolean).join(" ");
  return (
    <div className={classNames} {...rest}>
      {children}
    </div>
  );
};

export default PageContainer;
