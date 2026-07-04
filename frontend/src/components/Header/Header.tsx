import styles from './Header.module.scss';

export const Header = () => {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Rock Paper Scissors</h1>
      <p className={styles.subtitle}>Play against the Bot</p>
    </header>
  );
}
