import { useState, useRef, useCallback } from 'react';
import type { Action, Result, PlayResponse } from '../types/game';
import { playGame } from '../lib/api';
import Cookies from 'universal-cookie';

const cookies = new Cookies(null, { path: '/' });
const SCORE_COOKIE = 'rps_yourScore';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function loadScore(): number {
  const val = cookies.get(SCORE_COOKIE);
  const num = Number(val);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : 0;
}

function saveScore(score: number): void {
  cookies.set(SCORE_COOKIE, String(score), { maxAge: COOKIE_MAX_AGE, sameSite: 'lax' });
}

export function useGame() {
  const [yourScore, setYourScore] = useState<number>(loadScore);
  const [highScore, setHighScore] = useState<number>(0);
  const [botAction, setBotAction] = useState<Action | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const selectAction = useCallback(
    async (action: Action) => {
      if (isLocked || isLoading) return;

      setIsLoading(true);
      setIsLocked(true);
      setResult(null);

      try {
        const data: PlayResponse = await playGame({
          action,
          currentScore: yourScore,
        });

        // Reveal bot action immediately
        setBotAction(data.botAction);

        // After 2 seconds, resolve the round
        timerRef.current = setTimeout(() => {
          setYourScore(data.yourScore);
          setHighScore(data.highScore);
          setResult(data.result);
          setBotAction(null);
          setIsLocked(false);
          setIsLoading(false);
          saveScore(data.yourScore);
          timerRef.current = null;
        }, 2000);
      } catch (err) {
        console.error('API error:', err);
        setIsLocked(false);
        setIsLoading(false);
        setBotAction(null);
      }
    },
    [isLocked, isLoading, yourScore],
  );

  const updateHighScore = useCallback((newHighScore: number) => {
    setHighScore(newHighScore);
  }, []);

  return {
    yourScore,
    highScore,
    botAction,
    result,
    isLocked,
    isLoading,
    selectAction,
    updateHighScore,
    clearTimer,
    setHighScore,
  };
}
