import { useEffect, useCallback } from 'react';
import { Header } from './components/Header/Header';
import { ScoreBoard } from './components/ScoreBoard/ScoreBoard';
import { BotDisplay } from './components/BotDisplay/BotDisplay';
import { GameActions } from './components/GameActions/GameActions';
import { ResultBanner } from './components/ResultBanner/ResultBanner';
import { useGame } from './hooks/useGame';
import { useHighScoreSocket } from './hooks/useHighScoreSocket';
import { fetchHighScore } from './lib/api';
import styles from './App.module.scss';

export default function App() {
  const {
    yourScore,
    highScore,
    botAction,
    result,
    isLocked,
    selectAction,
    updateHighScore,
    setHighScore,
  } = useGame();

  // Load initial high score from server
  useEffect(() => {
    fetchHighScore()
      .then((data) => setHighScore(data.highScore))
      .catch(() => {});
  }, [setHighScore]);

  // Listen for real-time high score updates
  const handleHighScoreUpdate = useCallback(
    (score: number) => {
      updateHighScore(score);
    },
    [updateHighScore],
  );

  useHighScoreSocket(handleHighScoreUpdate);

  return (
    <div className={styles.app}>
      <Header />
      <ScoreBoard yourScore={yourScore} highScore={highScore} />
      <BotDisplay action={botAction} isLocked={isLocked} />
      <ResultBanner result={result} />
      <GameActions onSelect={selectAction} disabled={isLocked} />
    </div>
  );
}
