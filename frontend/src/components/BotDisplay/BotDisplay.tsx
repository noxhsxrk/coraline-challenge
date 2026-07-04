import type { Action } from '../../types/game';
import { ACTION_EMOJI } from '../../types/game';
import styles from './BotDisplay.module.scss';

interface BotDisplayProps {
  action: Action | null;
  isLocked: boolean;
}

export const BotDisplay = ({ action, isLocked }: BotDisplayProps) => {
  const display = action ? ACTION_EMOJI[action] : '❓';
  const label = action ? `Bot chose ${action}!` : 'Bot is waiting...';

  return (
    <div className={`${styles.container} ${isLocked ? styles.revealed : ''}`}>
      <p className={styles.label}>Bot</p>
      <div className={styles.display} data-testid="bot-display" aria-label={label}>
        <span className={`${styles.emoji} ${isLocked ? styles.bounce : ''}`}>
          {display}
        </span>
      </div>
    </div>
  );
}
