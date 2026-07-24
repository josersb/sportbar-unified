import styles from "./BrawlStarsButton.module.css";

const CapySVG = () => (
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <path fill="#878791" d="M181.7 65.8s-40.2-65.8-49.5-65.8-8.3 98.9-8.3 98.9l57.8-33.1z" />
    <path fill="#878791" d="M330.3 65.8s40.2-65.8 49.5-65.8 8.3 98.9 8.3 98.9l-57.8-33.1z" />
    <path fill="#C39B6E" d="M256 512c81.9 0 185.9-18.3 209.6-107.3 23.3-87.7-29.2-150.4-44.4-181.6-12.4-25.5-16.5-40.6-16.5-74.3C404.6 33.2 256 33 256 33S107.4 33.2 107.4 148.8c0 33.7-4.1 48.8-16.5 74.3-15.2 31.3-67.7 93.9-44.4 181.6C70.1 493.7 174.1 512 256 512z" />
    <path fill="#AC8A67" d="M256 82.4c-31.9 0-57.8 25.9-57.8 57.8v206.4c0 31.9 25.9 57.8 57.8 57.8s57.8-25.9 57.8-57.8V140.2c0-31.9-25.9-57.8-57.8-57.8z" />
    <path fill="#464655" d="M313.8 429c0 42.1-39.6 28.6-57.8 28.6s-57.8 13.5-57.8-28.6 25.9-28.6 57.8-28.6 57.8 13.5 57.8 28.6z" />
    <ellipse fill="#464655" cx="115.6" cy="164.9" rx="16.5" ry="24.8" />
    <ellipse fill="#464655" cx="396.4" cy="164.9" rx="16.5" ry="24.8" />
    <path fill="#C0C0C6" d="M283.6 200.3h-.1c-7.8-7-17.7-10.6-27.6-10.6s-19.8 3.5-27.6 10.6l-.1.1c-35 31.5-54.9 76.3-54.9 123.3v91.2c0 13.7 11.1 24.8 24.8 24.8h22.8c12.1 0 24.1-2.8 35-8.3 10.8 5.4 22.8 8.3 35 8.3h22.8c13.7 0 24.8-11.1 24.8-24.8v-91.2c0-47-20-94.8-55-126.3z" />
    <path fill="#9E9EA6" d="M308 241.5h-9.3c-6.4 0-12.7 1.5-18.5 4.4L267 252.5c-7 3.5-15.2 3.5-22.2 0l-13.2-6.6c-5.7-2.9-12.1-4.4-18.5-4.4h-9.3c-15.6 0-29.7 11.7-30.5 27.3-.9 16.7 12.4 30.5 28.9 30.5h4.1c24.8 0 24.8 33 49.5 33s24.8-33 49.5-33h4.1c16.5 0 29.7-13.8 28.9-30.5-.8-15.6-14.9-27.3-30.5-27.3z" />
    <path fill="#9E9EA6" d="M256 431.4c2.7 1.3 5.4 2.5 8.3 3.5V406.6c0-4.6-3.7-8.3-8.3-8.3s-8.3 3.7-8.3 8.3v28.3c2.7-1 5.5-2.2 8.3-3.5z" />
    <circle fill="#464655" cx="202.3" cy="270.4" r="12.4" />
    <circle fill="#464655" cx="309.7" cy="270.4" r="12.4" />
  </svg>
);

const BrawlStarsButton = ({ deviceId, isActive = false, onClick, loading = false, dataTestId }) => {
  const classNames = [styles.btn, isActive ? styles.selected : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      data-testid={dataTestId}
      onClick={onClick}
      disabled={loading}
      className={classNames}
    >
      <span className={styles.shine}></span>
      <span className={styles.highlight}></span>
      <span className={styles.capy}>
        <CapySVG />
      </span>
      <span className={styles.text}>{deviceId}</span>
    </button>
  );
};

export default BrawlStarsButton;
