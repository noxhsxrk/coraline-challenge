import { Injectable } from '@nestjs/common';
import { ScoreService } from '../score/score.service';

export type Action = 'rock' | 'paper' | 'scissors';
export type Result = 'win' | 'lose' | 'draw';

export interface PlayResponse {
  botAction: Action;
  result: Result;
  yourScore: number;
  highScore: number;
}

const ACTIONS: Action[] = ['rock', 'paper', 'scissors'];

const WIN_MAP: Record<Action, Action> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

@Injectable()
export class GameService {
  constructor(private readonly scoreService: ScoreService) {}

  play(playerAction: Action, currentScore: number): PlayResponse {
    const botAction = this.randomAction();
    const result = this.determineResult(playerAction, botAction);

    let yourScore = currentScore;

    if (result === 'win') {
      yourScore = currentScore + 1;
    } else if (result === 'lose') {
      yourScore = 0;
    }
    // draw: score stays the same

    const highScore = this.scoreService.updateHighScore(yourScore);

    return { botAction, result, yourScore, highScore };
  }

  private randomAction(): Action {
    const index = Math.floor(Math.random() * ACTIONS.length);
    return ACTIONS[index];
  }

  private determineResult(player: Action, bot: Action): Result {
    if (player === bot) return 'draw';
    if (WIN_MAP[player] === bot) return 'win';
    return 'lose';
  }
}
