import { Test, TestingModule } from '@nestjs/testing';
import { GameService } from './game.service';
import { ScoreService } from '../score/score.service';

describe('GameService', () => {
  let gameService: GameService;
  let scoreService: ScoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: ScoreService,
          useValue: {
            getHighScore: jest.fn().mockReturnValue(0),
            updateHighScore: jest.fn().mockImplementation((s) => s),
          },
        },
      ],
    }).compile();

    gameService = module.get<GameService>(GameService);
    scoreService = module.get<ScoreService>(ScoreService);
  });

  describe('play', () => {
    it('should return botAction, result, yourScore, and highScore', () => {
      const response = gameService.play('rock', 0);

      expect(response).toHaveProperty('botAction');
      expect(response).toHaveProperty('result');
      expect(response).toHaveProperty('yourScore');
      expect(response).toHaveProperty('highScore');
      expect(['rock', 'paper', 'scissors']).toContain(response.botAction);
      expect(['win', 'lose', 'draw']).toContain(response.result);
    });

    it('should increment score when player wins', () => {
      // We need to mock randomAction to control the bot's choice.
      // Player: rock, Bot: scissors → win
      jest.spyOn(gameService as any, 'randomAction').mockReturnValue('scissors');

      const response = gameService.play('rock', 5);
      expect(response.result).toBe('win');
      expect(response.yourScore).toBe(6);
    });

    it('should reset score to 0 when player loses', () => {
      jest.spyOn(gameService as any, 'randomAction').mockReturnValue('paper');

      const response = gameService.play('rock', 5);
      expect(response.result).toBe('lose');
      expect(response.yourScore).toBe(0);
    });

    it('should keep score unchanged on draw', () => {
      jest.spyOn(gameService as any, 'randomAction').mockReturnValue('rock');

      const response = gameService.play('rock', 5);
      expect(response.result).toBe('draw');
      expect(response.yourScore).toBe(5);
    });

    it('should update high score via ScoreService', () => {
      jest.spyOn(gameService as any, 'randomAction').mockReturnValue('scissors');

      gameService.play('rock', 5);
      expect(scoreService.updateHighScore).toHaveBeenCalledWith(6);
    });

    it('should pass 0 to updateHighScore when player loses', () => {
      jest.spyOn(gameService as any, 'randomAction').mockReturnValue('paper');

      gameService.play('rock', 5);
      expect(scoreService.updateHighScore).toHaveBeenCalledWith(0);
    });
  });

  describe('randomAction', () => {
    it('should always return a valid action', () => {
      const results = new Set();
      // Run many times to catch all possibilities
      for (let i = 0; i < 100; i++) {
        const action = (gameService as any).randomAction();
        results.add(action);
      }
      expect(results.has('rock')).toBe(true);
      expect(results.has('paper')).toBe(true);
      expect(results.has('scissors')).toBe(true);
    });
  });
});
