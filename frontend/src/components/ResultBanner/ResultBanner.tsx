import type { Result } from '../../types/game';
import { RESULT_LABEL } from '../../types/game';
import styles from './ResultBanner.module.scss';

interface ResultBannerProps {
  result: Result | null;
}

export function ResultBanner({ result }: ResultBannerProps) {
  if (!result) return null;

  return (
    <div
      className={`${styles.banner} ${styles[result]}`}
      data-testid="result-banner"
      role="alert"
    >
      {RESULT_LABEL[result]}
    </div>
  );
}
