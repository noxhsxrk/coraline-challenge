import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { ScoreService } from '../score/score.service';
import { Subject } from 'rxjs';
import { Server, Socket } from 'socket.io';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let highScoreChanged$: Subject<number>;

  const mockServer: Pick<Server, 'emit'> = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    highScoreChanged$ = new Subject<number>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: ScoreService,
          useValue: {
            highScoreChanged$,
            getHighScore: jest.fn().mockReturnValue(5),
            updateHighScore: jest.fn(),
            createSession: jest.fn(),
            getSession: jest.fn(),
            setScore: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    Object.assign(gateway, { server: mockServer });
  });

  afterEach(() => {
    gateway.onModuleDestroy();
  });

  describe('afterInit', () => {
    it('subscribes to highScoreChanged$ and emits to clients', () => {
      gateway.afterInit();
      highScoreChanged$.next(10);

      expect(mockServer.emit).toHaveBeenCalledWith('highScoreUpdated', {
        highScore: 10,
      });
    });
  });

  describe('handleConnection', () => {
    it('sends current high score to newly connected client', () => {
      const client: Pick<Socket, 'emit'> = { emit: jest.fn() };

      gateway.handleConnection(client as Socket);

      expect(client.emit).toHaveBeenCalledWith('highScoreUpdated', {
        highScore: 5,
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('unsubscribes to prevent memory leak', () => {
      gateway.afterInit();
      gateway.onModuleDestroy();

      highScoreChanged$.next(99);
      expect(mockServer.emit).not.toHaveBeenCalledWith('highScoreUpdated', {
        highScore: 99,
      });
    });
  });
});
