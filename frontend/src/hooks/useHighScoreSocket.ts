import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL ?? '';

export function useHighScoreSocket(onHighScoreUpdate: (score: number) => void) {
  useEffect(() => {
    const socket: Socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('highScoreUpdated', (data: { highScore: number }) => {
      onHighScoreUpdate(data.highScore);
    });

    return () => {
      socket.disconnect();
    };
  }, [onHighScoreUpdate]);
}
