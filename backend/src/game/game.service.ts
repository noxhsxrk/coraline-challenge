import { Injectable, Inject } from '@nestjs/common';
import { IScoreService } from '../score/score.interface';
import { SCORE_SERVICE_TOKEN } from '../score/score.module';

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
  constructor(
    @Inject(SCORE_SERVICE_TOKEN)
    private readonly scoreService: IScoreService,
  ) {}

  play(action: Action, sessionId: string): PlayResponse {
    const botAction = this.randomAction();
    const result = this.determineResult(action, botAction);

    const session = this.scoreService.getSession(sessionId);
    const currentScore = session?.yourScore ?? 0;

    let yourScore = currentScore;
    if (result === 'win') {
      yourScore = currentScore + 1;
    } else if (result === 'lose') {
      yourScore = 0;
    }

    if (session) {
      this.scoreService.setScore(sessionId, yourScore);
    }

    const highScore = this.scoreService.updateHighScore(yourScore);
    return { botAction, result, yourScore, highScore };
  }

  private randomAction(): Action {
    return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  }

  private determineResult(player: Action, bot: Action): Result {
    if (player === bot) return 'draw';
    if (WIN_MAP[player] === bot) return 'win';
    return 'lose';
  }
}
