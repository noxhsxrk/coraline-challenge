import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { SCORE_SERVICE_TOKEN } from '../score/score.module';

describe('GameService', () => {
  let gameService: GameService;

  const mockSession = { yourScore: 0 };

  const mockScoreService = {
    getHighScore: jest.fn().mockReturnValue(0),
    updateHighScore: jest.fn().mockImplementation((s) => s),
    getSession: jest.fn().mockReturnValue(mockSession),
    setScore: jest.fn(),
    createSession: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSession.yourScore = 0;
    mockScoreService.getSession.mockReturnValue(mockSession);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        { provide: SCORE_SERVICE_TOKEN, useValue: mockScoreService },
      ],
    }).compile();

    gameService = module.get<GameService>(GameService);
  });

  describe('play', () => {
    it('returns botAction, result, yourScore, and highScore', () => {
      const response = gameService.play('rock', 's1');
      expect(response).toHaveProperty('botAction');
      expect(response).toHaveProperty('result');
      expect(response).toHaveProperty('yourScore');
      expect(response).toHaveProperty('highScore');
      expect(['rock', 'paper', 'scissors']).toContain(response.botAction);
      expect(['win', 'lose', 'draw']).toContain(response.result);
    });

    it('increments score on win', () => {
      mockSession.yourScore = 5;
      jest.spyOn(gameService as any, 'randomAction').mockReturnValue('scissors');
      const r = gameService.play('rock', 's1');
      expect(r.result).toBe('win');
      expect(r.yourScore).toBe(6);
      expect(mockScoreService.setScore).toHaveBeenCalledWith('s1', 6);
    });

    it('resets score to 0 on lose', () => {
      mockSession.yourScore = 5;
      jest.spyOn(gameService as any, 'randomAction').mockReturnValue('paper');
      const r = gameService.play('rock', 's1');
      expect(r.result).toBe('lose');
      expect(r.yourScore).toBe(0);
    });

    it('keeps score on draw', () => {
      mockSession.yourScore = 5;
      jest.spyOn(gameService as any, 'randomAction').mockReturnValue('rock');
      const r = gameService.play('rock', 's1');
      expect(r.result).toBe('draw');
      expect(r.yourScore).toBe(5);
    });

    it('defaults to 0 when session not found', () => {
      mockScoreService.getSession.mockReturnValue(undefined);
      const r = gameService.play('rock', 'ghost');
      expect(r.yourScore).toBeGreaterThanOrEqual(0);
    });
  });
});
