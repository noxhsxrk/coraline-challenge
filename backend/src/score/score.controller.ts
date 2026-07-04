import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ScoreService } from './score.service';

@Controller('api')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Get('score')
  getScore(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = this.scoreService.ensureSession(req, res);
    const session = this.scoreService.getSession(sessionId);
    return {
      highScore: this.scoreService.getHighScore(),
      yourScore: session?.yourScore ?? 0,
    };
  }
}
