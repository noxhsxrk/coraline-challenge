import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ScoreService } from '../score/score.service';

@Controller('api')
export class NonceController {
  constructor(private readonly scoreService: ScoreService) {}

  @Get('nonce')
  getNonce(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sessionId = this.scoreService.ensureSession(req, res);
    return { nonce: this.scoreService.createNonce(sessionId) };
  }
}
