import { Controller, Post, Body, Req, Res, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { GameService } from './game.service';
import { ScoreService } from '../score/score.service';
import { PlayRequestDto } from './play-request.dto';

@Controller('api/game')
export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly scoreService: ScoreService,
  ) {}

  @Post('play')
  play(
    @Body() body: PlayRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = this.scoreService.ensureSession(req, res);

    if (!this.scoreService.validateNonce(sessionId, body.nonce)) {
      throw new BadRequestException('Invalid or expired nonce');
    }

    return this.gameService.play(body.action, sessionId);
  }
}
