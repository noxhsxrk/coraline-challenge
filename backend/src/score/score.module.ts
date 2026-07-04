import { Module, Global } from '@nestjs/common';
import { ScoreService } from './score.service';
import { ScoreController } from './score.controller';
import { IScoreService } from './score.interface';

export const SCORE_SERVICE_TOKEN = 'SCORE_SERVICE';

@Global()
@Module({
  controllers: [ScoreController],
  providers: [
    ScoreService,
    { provide: SCORE_SERVICE_TOKEN, useExisting: ScoreService },
  ],
  exports: [ScoreService, SCORE_SERVICE_TOKEN],
})
export class ScoreModule {}
