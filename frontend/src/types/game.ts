export type Action = 'rock' | 'paper' | 'scissors';
export type Result = 'win' | 'lose' | 'draw';

export interface PlayRequest {
  action: Action;
  currentScore: number;
}

export interface PlayResponse {
  botAction: Action;
  result: Result;
  yourScore: number;
  highScore: number;
}

export interface HighScoreResponse {
  highScore: number;
}

export const ACTION_EMOJI: Record<Action, string> = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
};

export const ACTION_LABEL: Record<Action, string> = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors',
};

export const RESULT_LABEL: Record<Result, string> = {
  win: 'You Win! 🎉',
  lose: 'You Lose! 😢',
  draw: "It's a Draw! 🤝",
};
