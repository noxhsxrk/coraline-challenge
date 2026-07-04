import type { HistoryEntry } from '../../types/game';
import { ACTION_EMOJI, RESULT_ICON } from '../../types/game';
import styles from './History.module.scss';

interface HistoryProps {
  entries: HistoryEntry[];
}

export const History = ({ entries }: HistoryProps) => {
  if (entries.length === 0) return null;

  return (
    <div className={styles.panel} data-testid="history-panel">
      <h2 className={styles.heading}>History</h2>
      <div className={styles.list}>
        {entries.map((entry) => (
          <div key={entry.id} className={`${styles.row} ${styles[entry.result]}`}>
            <span className={styles.round}>#{entry.round}</span>
            <span className={styles.move}>
              {ACTION_EMOJI[entry.player]}
            </span>
            <span className={styles.vs}>vs</span>
            <span className={styles.move}>
              {ACTION_EMOJI[entry.bot]}
            </span>
            <span className={`${styles.badge} ${styles[entry.result]}`}>
              {RESULT_ICON[entry.result]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
