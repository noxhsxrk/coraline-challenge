import { useState, useRef, useCallback, useEffect } from 'react';
import type { Action, Result, HistoryEntry, PlayResponse } from '../types/game';
import { playGame, fetchNonce } from '../lib/api';

const REVEAL_MS = 2000;
const MAX_HISTORY = 50;

export function useGame() {
  const [yourScore, setYourScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [botAction, setBotAction] = useState<Action | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);
  const roundRef = useRef(0);
  const entryIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const selectAction = useCallback(
    async (action: Action) => {
      if (lockRef.current) return;

      lockRef.current = true;
      setIsLoading(true);
      setIsLocked(true);
      setResult(null);
      setError(null);

      try {
        const { nonce } = await fetchNonce();
        const data: PlayResponse = await playGame({ action, nonce });

        setBotAction(data.botAction);

        timerRef.current = setTimeout(() => {
          roundRef.current += 1;
          const entry: HistoryEntry = {
            id: ++entryIdRef.current,
            player: action,
            bot: data.botAction,
            result: data.result,
            round: roundRef.current,
          };

          setYourScore(data.yourScore);
          setHighScore(data.highScore);
          setResult(data.result);
          setBotAction(null);
          setIsLocked(false);
          setIsLoading(false);
          lockRef.current = false;
          setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
          timerRef.current = null;
        }, REVEAL_MS);
      } catch {
        setError('Connection lost. Try again.');
        setIsLocked(false);
        setIsLoading(false);
        lockRef.current = false;
        setBotAction(null);
      }
    },
    [],
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
    error,
    history,
    selectAction,
    updateHighScore,
    setHighScore,
    setYourScore,
  };
}
