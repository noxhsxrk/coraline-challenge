import { Module } from '@nestjs/common';
import { GameModule } from './game/game.module';
import { ScoreModule } from './score/score.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [GameModule, ScoreModule, WebsocketModule],
})
export class AppModule {}
