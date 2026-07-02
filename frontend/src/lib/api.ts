import type { PlayRequest, PlayResponse, HighScoreResponse } from '../types/game';

// In production (Docker/nginx), API is proxied so same-origin works.
// In dev, point to the backend directly.
const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function playGame(data: PlayRequest): Promise<PlayResponse> {
  const res = await fetch(`${API_BASE}/api/game/play`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }

  return res.json();
}

export async function fetchHighScore(): Promise<HighScoreResponse> {
  const res = await fetch(`${API_BASE}/api/score`);

  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }

  return res.json();
}
