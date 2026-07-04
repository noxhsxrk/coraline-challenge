import type { PlayRequest, PlayResponse, ScoreResponse } from '../types/game';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export const fetchNonce = async (): Promise<{ nonce: string }> => {
  const res = await fetch(`${API_BASE}/api/nonce`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
};

export const playGame = async (data: PlayRequest): Promise<PlayResponse> => {
  const res = await fetch(`${API_BASE}/api/game/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
};

export const fetchScore = async (): Promise<ScoreResponse> => {
  const res = await fetch(`${API_BASE}/api/score`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  return res.json();
};
