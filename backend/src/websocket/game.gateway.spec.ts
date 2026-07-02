import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { ScoreService } from '../score/score.service';
import { Subject } from 'rxjs';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let highScoreChanged$: Subject<number>;

  const mockServer = {
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
    (gateway as any).server = mockServer;
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
      const client = { emit: jest.fn() } as any;

      gateway.handleConnection(client);

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
