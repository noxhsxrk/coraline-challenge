import { Module, Global } from '@nestjs/common';
import { ScoreService } from './score.service';
import { IScoreService } from './score.interface';

export const SCORE_SERVICE_TOKEN = 'SCORE_SERVICE';

@Global()
@Module({
  providers: [
    ScoreService,
    { provide: SCORE_SERVICE_TOKEN, useExisting: ScoreService },
  ],
  exports: [ScoreService, SCORE_SERVICE_TOKEN],
})
export class ScoreModule {}
