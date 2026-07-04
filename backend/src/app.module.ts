import { Module } from '@nestjs/common';
import { GameModule } from './game/game.module';
import { ScoreModule } from './score/score.module';
import { HealthModule } from './health/health.module';
import { NonceModule } from './nonce/nonce.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [GameModule, ScoreModule, HealthModule, NonceModule, WebsocketModule],
})
export class AppModule {}
