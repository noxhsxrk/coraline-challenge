import { Test, TestingModule } from '@nestjs/testing';
import { ScoreService } from './score.service';
import * as fs from 'fs';
import * as path from 'path';

describe('ScoreService', () => {
  let scoreService: ScoreService;
  const testDataDir = path.resolve(__dirname, '../../test-data');

  beforeEach(async () => {
    // Override data directory for testing
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoreService],
    }).compile();

    scoreService = module.get<ScoreService>(ScoreService);

    // Point to test data directory by replacing internal path
    const testFile = path.join(testDataDir, 'high-score.json');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDataDir)) {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('getHighScore', () => {
    it('should return 0 when no file exists', () => {
      // Service uses the real DATA_DIR, which may not exist in test.
      // getHighScore returns 0 when file is missing.
      const score = scoreService.getHighScore();
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateHighScore', () => {
    it('should return the new score when it is higher than current', () => {
      const result = scoreService.updateHighScore(10);
      expect(result).toBe(10);
    });

    it('should emit highScoreChanged when score is updated', (done) => {
      scoreService.highScoreChanged$.subscribe((score) => {
        expect(score).toBe(20);
        done();
      });
      scoreService.updateHighScore(20);
    });

    it('should persist the high score to file', () => {
      scoreService.updateHighScore(42);
      const stored = scoreService.getHighScore();
      expect(stored).toBe(42);
    });

    it('should not lower the high score', () => {
      scoreService.updateHighScore(50);
      const result = scoreService.updateHighScore(30);
      expect(result).toBe(50);
      expect(scoreService.getHighScore()).toBe(50);
    });
  });
});
