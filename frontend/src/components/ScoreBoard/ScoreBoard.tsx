import styles from './ScoreBoard.module.scss';

interface ScoreBoardProps {
  yourScore: number;
  highScore: number;
}

export function ScoreBoard({ yourScore, highScore }: ScoreBoardProps) {
  return (
    <div className={styles.board}>
      <div className={styles.score}>
        <span className={styles.label}>Your Score</span>
        <span className={styles.value} data-testid="your-score">
          {yourScore}
        </span>
      </div>
      <div className={styles.divider} />
      <div className={styles.score}>
        <span className={styles.label}>High Score</span>
        <span className={`${styles.value} ${styles.high}`} data-testid="high-score">
          {highScore}
        </span>
      </div>
    </div>
  );
}
