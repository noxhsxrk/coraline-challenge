import { Test, TestingModule } from '@nestjs/testing';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { ScoreService } from '../score/score.service';

describe('GameController', () => {
  let controller: GameController;

  const mockGameService = {
    play: jest.fn().mockReturnValue({
      botAction: 'paper',
      result: 'win',
      yourScore: 1,
      highScore: 1,
    }),
  };

  const mockScoreService = {
    getHighScore: jest.fn().mockReturnValue(10),
    updateHighScore: jest.fn(),
    createSession: jest.fn().mockReturnValue('new-session-123'),
    getSession: jest.fn().mockReturnValue({ yourScore: 5 }),
    setScore: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockScoreService.getSession.mockReturnValue({ yourScore: 5 });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        { provide: GameService, useValue: mockGameService },
        { provide: ScoreService, useValue: mockScoreService },
      ],
    }).compile();

    controller = module.get<GameController>(GameController);
  });

  describe('POST /api/game/play', () => {
    it('creates session cookie on first request', () => {
      const req = { cookies: {} } as any;
      const res = { cookie: jest.fn() } as any;

      controller.play({ action: 'rock' }, req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        'rps_session',
        'new-session-123',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('reuses existing session cookie', () => {
      const req = { cookies: { rps_session: 'existing' } } as any;
      const res = { cookie: jest.fn() } as any;

      controller.play({ action: 'paper' }, req, res);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(mockGameService.play).toHaveBeenCalledWith('paper', 'existing');
    });

    it('delegates to GameService and returns result', () => {
      const req = { cookies: { rps_session: 's1' } } as any;
      const res = { cookie: jest.fn() } as any;

      const result = controller.play({ action: 'scissors' }, req, res);

      expect(result).toEqual({
        botAction: 'paper',
        result: 'win',
        yourScore: 1,
        highScore: 1,
      });
    });

    it('recreates session if expired', () => {
      mockScoreService.getSession.mockReturnValueOnce(undefined);
      const req = { cookies: { rps_session: 'expired' } } as any;
      const res = { cookie: jest.fn() } as any;

      controller.play({ action: 'rock' }, req, res);

      expect(res.cookie).toHaveBeenCalled();
    });
  });

  describe('GET /api/score', () => {
    it('returns highScore and yourScore', () => {
      const req = { cookies: { rps_session: 's1' } } as any;
      const res = { cookie: jest.fn() } as any;

      const result = controller.getHighScore(req, res);

      expect(result).toEqual({ highScore: 10, yourScore: 5 });
    });

    it('returns yourScore 0 when session not found', () => {
      mockScoreService.getSession.mockReturnValueOnce(undefined);
      const req = { cookies: {} } as any;
      const res = { cookie: jest.fn() } as any;

      const result = controller.getHighScore(req, res);

      expect(result.yourScore).toBe(0);
    });
  });

  describe('GET /api/health', () => {
    it('returns status ok', () => {
      expect(controller.health()).toEqual({ status: 'ok' });
    });
  });
});
