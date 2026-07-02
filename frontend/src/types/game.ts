export type Action = 'rock' | 'paper' | 'scissors';
export type Result = 'win' | 'lose' | 'draw';

export interface PlayRequest {
  action: Action;
}

export interface PlayResponse {
  botAction: Action;
  result: Result;
  yourScore: number;
  highScore: number;
}

export interface ScoreResponse {
  highScore: number;
  yourScore: number;
}

export const ACTION_EMOJI: Record<Action, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

export const ACTION_LABEL: Record<Action, string> = {
  rock: 'Rock',
  paper: 'Paper',
  scissors: 'Scissors',
};

export const RESULT_LABEL: Record<Result, string> = {
  win: 'You Win! ✨',
  lose: 'You Lose! 💥',
  draw: "It's a Draw! 🤝",
};

export const RESULT_ICON: Record<Result, string> = {
  win: '+',
  lose: '−',
  draw: '=',
};

export interface HistoryEntry {
  id: number;
  player: Action;
  bot: Action;
  result: Result;
  round: number;
}
