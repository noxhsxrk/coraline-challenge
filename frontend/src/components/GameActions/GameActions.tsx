import type { Action } from '../../types/game';
import { ACTION_EMOJI, ACTION_LABEL } from '../../types/game';
import styles from './GameActions.module.scss';

const ACTIONS: Action[] = ['rock', 'paper', 'scissors'];

interface GameActionsProps {
  onSelect: (action: Action) => void;
  disabled: boolean;
}

export const GameActions = ({ onSelect, disabled }: GameActionsProps) => {
  return (
    <div className={styles.actions}>
      {ACTIONS.map((action) => (
        <button
          key={action}
          className={styles.btn}
          onClick={() => onSelect(action)}
          disabled={disabled}
          aria-label={ACTION_LABEL[action]}
          data-testid={`btn-${action}`}
        >
          <span className={styles.emoji}>{ACTION_EMOJI[action]}</span>
          <span className={styles.label}>{ACTION_LABEL[action]}</span>
        </button>
      ))}
    </div>
  );
}
