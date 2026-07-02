import { Controller, Post, Get, Body } from '@nestjs/common';
import { GameService, PlayResponse } from './game.service';
import { ScoreService } from '../score/score.service';

interface PlayRequest {
  action: 'rock' | 'paper' | 'scissors';
  currentScore: number;
}

@Controller('api')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly scoreService: ScoreService,
  ) {}

  @Post('game/play')
  play(@Body() body: PlayRequest): PlayResponse {
    const { action, currentScore } = body;
    return this.gameService.play(action, currentScore);
  }

  @Get('score')
  getHighScore(): { highScore: number } {
    return { highScore: this.scoreService.getHighScore() };
  }

  @Get('health')
  health(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
