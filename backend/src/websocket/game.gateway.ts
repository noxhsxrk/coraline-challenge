import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ScoreService } from '../score/score.service';
import { Subscription } from 'rxjs';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
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

  handleConnection(client: Socket): void {
    const highScore = this.scoreService.getHighScore();
    client.emit('highScoreUpdated', { highScore });
  }

  onModuleDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
