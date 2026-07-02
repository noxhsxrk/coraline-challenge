import { useEffect, useCallback } from 'react';
import { Header } from './components/Header/Header';
import { ScoreBoard } from './components/ScoreBoard/ScoreBoard';
import { BotDisplay } from './components/BotDisplay/BotDisplay';
import { GameActions } from './components/GameActions/GameActions';
import { ResultBanner } from './components/ResultBanner/ResultBanner';
import { History } from './components/History/History';
import { useGame } from './hooks/useGame';
import { useHighScoreSocket } from './hooks/useHighScoreSocket';
import { fetchScore } from './lib/api';
import styles from './App.module.scss';

export default function App() {
  const {
    yourScore,
    highScore,
    botAction,
    result,
    isLocked,
    error,
    history,
    selectAction,
    updateHighScore,
    setHighScore,
    setYourScore,
  } = useGame();

  useEffect(() => {
    fetchScore()
      .then((data) => {
        setHighScore(data.highScore);
        setYourScore(data.yourScore);
      })
      .catch(() => {});
  }, [setHighScore, setYourScore]);

  const handleHighScoreUpdate = useCallback(
    (score: number) => {
      updateHighScore(score);
    },
    [updateHighScore],
  );

  useHighScoreSocket(handleHighScoreUpdate);

  return (
    <div className={styles.layout}>
      <div className={styles.game}>
        <Header />
        <ScoreBoard yourScore={yourScore} highScore={highScore} />
        <BotDisplay action={botAction} isLocked={isLocked} />
        <ResultBanner result={result} />
        {error && <p className={styles.error}>{error}</p>}
        <GameActions onSelect={selectAction} disabled={isLocked} />
      </div>
      <History entries={history} />
    </div>
  );
}
