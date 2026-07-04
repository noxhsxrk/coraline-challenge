import { Test, TestingModule } from '@nestjs/testing';
import { ScoreService } from './score.service';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data');
const HIGH_SCORE_FILE = path.join(DATA_DIR, 'high-score.json');

const resetScore = (): void => {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(HIGH_SCORE_FILE, JSON.stringify({ highScore: 0 }), 'utf-8');
};

describe('ScoreService', () => {
  let scoreService: ScoreService;

  beforeAll(() => resetScore());

  beforeEach(async () => {
    resetScore();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoreService],
    }).compile();
    scoreService = module.get<ScoreService>(ScoreService);
  });

  afterAll(() => resetScore());

  describe('getHighScore', () => {
    it('returns 0 when file has 0', () => {
      expect(scoreService.getHighScore()).toBe(0);
    });

    it('returns 0 when file is corrupted', () => {
      fs.writeFileSync(HIGH_SCORE_FILE, '{ corrupted', 'utf-8');
      expect(scoreService.getHighScore()).toBe(0);
    });
  });

  describe('updateHighScore', () => {
    it('returns new score when higher', () => {
      expect(scoreService.updateHighScore(10)).toBe(10);
    });

    it('emits highScoreChanged', (done) => {
      scoreService.highScoreChanged$.subscribe((score) => {
        expect(score).toBe(20);
        done();
      });
      scoreService.updateHighScore(20);
    });

    it('persists to file', () => {
      scoreService.updateHighScore(42);
      expect(scoreService.getHighScore()).toBe(42);
    });

    it('does not lower the high score', () => {
      scoreService.updateHighScore(50);
      expect(scoreService.updateHighScore(30)).toBe(50);
      expect(scoreService.getHighScore()).toBe(50);
    });
  });

  describe('sessions', () => {
    it('createSession returns a non-empty string', () => {
      const id = scoreService.createSession();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('getSession returns session with yourScore 0 for new session', () => {
      const id = scoreService.createSession();
      const session = scoreService.getSession(id);
      expect(session).toBeDefined();
      expect(session!.yourScore).toBe(0);
    });

    it('getSession returns undefined for unknown id', () => {
      expect(scoreService.getSession('nonexistent')).toBeUndefined();
    });

    it('setScore updates session score', () => {
      const id = scoreService.createSession();
      scoreService.setScore(id, 7);
      expect(scoreService.getSession(id)!.yourScore).toBe(7);
    });

    it('setScore clamps negative to 0', () => {
      const id = scoreService.createSession();
      scoreService.setScore(id, -5);
      expect(scoreService.getSession(id)!.yourScore).toBe(0);
    });

    it('setScore ignores unknown session without error', () => {
      expect(() => scoreService.setScore('ghost', 10)).not.toThrow();
    });
  });

  describe('cleanupSessions', () => {
    it('removes expired sessions', () => {
      const id = scoreService.createSession();
      scoreService.cleanupSessions(-1);
      expect(scoreService.getSession(id)).toBeUndefined();
    });

    it('keeps active sessions', () => {
      const id = scoreService.createSession();
      scoreService.cleanupSessions(60 * 60 * 1000);
      expect(scoreService.getSession(id)).toBeDefined();
    });
  });
});
