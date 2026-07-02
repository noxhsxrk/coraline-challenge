import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../data');
const HIGH_SCORE_FILE = path.join(DATA_DIR, 'high-score.json');

@Injectable()
export class ScoreService {
  readonly highScoreChanged$ = new Subject<number>();

  getHighScore(): number {
    try {
      if (!fs.existsSync(HIGH_SCORE_FILE)) {
        return 0;
      }
      const raw = fs.readFileSync(HIGH_SCORE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return typeof data.highScore === 'number' ? data.highScore : 0;
    } catch {
      return 0;
    }
  }

  updateHighScore(newScore: number): number {
    const current = this.getHighScore();
    if (newScore > current) {
      this.writeHighScore(newScore);
      this.highScoreChanged$.next(newScore);
      return newScore;
    }
    return current;
  }

  private writeHighScore(score: number): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(HIGH_SCORE_FILE, JSON.stringify({ highScore: score }), 'utf-8');
  }
}
