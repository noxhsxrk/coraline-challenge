import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { ScoreService } from '../score/score.service';
import { Subscription } from 'rxjs';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server: Server;
  private subscription: Subscription;

  constructor(private readonly scoreService: ScoreService) {}

  afterInit(): void {
    this.subscription = this.scoreService.highScoreChanged$.subscribe(
      (highScore) => {
        this.server.emit('highScoreUpdated', { highScore });
      },
    );
  }

  handleConnection(client: any): void {
    const highScore = this.scoreService.getHighScore();
    client.emit('highScoreUpdated', { highScore });
  }

  onModuleDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
