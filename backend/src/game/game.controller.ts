import { Controller, Post, Get, Body, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { GameService, PlayResponse } from './game.service';
import { ScoreService } from '../score/score.service';
import { PlayRequestDto } from './play-request.dto';

const SESSION_COOKIE = 'rps_session';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('api')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly scoreService: ScoreService,
  ) {}

  private ensureSession(req: Request, res: Response): string {
    let sessionId = req.cookies?.[SESSION_COOKIE];
    if (!sessionId) {
      sessionId = this.scoreService.createSession();
      res.cookie(SESSION_COOKIE, sessionId, COOKIE_OPTIONS);
    } else if (!this.scoreService.getSession(sessionId)) {
      sessionId = this.scoreService.createSession();
      res.cookie(SESSION_COOKIE, sessionId, COOKIE_OPTIONS);
    }
    return sessionId;
  }

  @Post('game/play')
  play(
    @Body() body: PlayRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): PlayResponse {
    const sessionId = this.ensureSession(req, res);
    return this.gameService.play(body.action, sessionId);
  }

  @Get('score')
  getHighScore(@Req() req: Request, @Res({ passthrough: true }) res: Response): {
    highScore: number;
    yourScore: number;
  } {
    const sessionId = this.ensureSession(req, res);
    const session = this.scoreService.getSession(sessionId);
    return {
      highScore: this.scoreService.getHighScore(),
      yourScore: session?.yourScore ?? 0,
    };
  }

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
