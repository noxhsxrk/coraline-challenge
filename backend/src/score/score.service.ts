import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Request, Response } from 'express';
import { Subject } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { IScoreService } from './score.interface';

const DATA_DIR = path.resolve(__dirname, '../../data');
const HIGH_SCORE_FILE = path.join(DATA_DIR, 'high-score.json');
const SESSION_CLEANUP_MS = 5 * 60 * 1000;

const SESSION_COOKIE = 'rps_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

interface Session {
  yourScore: number;
  lastSeen: number;
}

@Injectable()
export class ScoreService implements IScoreService, OnModuleInit, OnModuleDestroy {
  private highScoreChangedSource = new Subject<number>();
  readonly highScoreChanged$ = this.highScoreChangedSource.asObservable();
  private sessions = new Map<string, Session>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  ensureSession(req: Request, res: Response): string {
    const secure = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    const options = {
      httpOnly: true,
      secure,
      sameSite: 'strict' as const,
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    };

    let sessionId = (req as any).cookies?.[SESSION_COOKIE];
    if (!sessionId) {
      sessionId = this.createSession();
      res.cookie(SESSION_COOKIE, sessionId, options);
    } else if (!this.getSession(sessionId)) {
      sessionId = this.createSession();
      res.cookie(SESSION_COOKIE, sessionId, options);
    }
    return sessionId;
  }

  onModuleInit(): void {
    this.cleanupTimer = setInterval(() => this.cleanupSessions(), SESSION_CLEANUP_MS);
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.highScoreChangedSource.complete();
  }

  getHighScore(): number {
    try {
      if (!fs.existsSync(HIGH_SCORE_FILE)) return 0;
      const data = JSON.parse(fs.readFileSync(HIGH_SCORE_FILE, 'utf-8'));
      if (typeof data?.highScore !== 'number' || !Number.isFinite(data.highScore) || data.highScore < 0 || !Number.isInteger(data.highScore)) {
        return 0;
      }
      return data.highScore;
    } catch {
      return 0;
    }
  }

  updateHighScore(newScore: number): number {
    const current = this.getHighScore();
    if (newScore > current) {
      this.writeHighScore(newScore);
      this.highScoreChangedSource.next(newScore);
      return newScore;
    }
    return current;
  }

  private writeHighScore(score: number): void {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(HIGH_SCORE_FILE, JSON.stringify({ highScore: score }), 'utf-8');
  }

  createSession(): string {
    const id = crypto.randomUUID();
    this.sessions.set(id, { yourScore: 0, lastSeen: Date.now() });
    return id;
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  setScore(id: string, score: number): void {
    const session = this.sessions.get(id);
    if (session) {
      session.yourScore = Math.max(0, Math.min(score, Number.MAX_SAFE_INTEGER));
      session.lastSeen = Date.now();
    }
  }

  createNonce(sessionId: string): string {
    const nonce = crypto.randomUUID();
    const session = this.sessions.get(sessionId);
    if (session) {
      (session as any).nonce = nonce;
    }
    return nonce;
  }

  validateNonce(sessionId: string, nonce: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !(session as any).nonce) return false;
    const valid = (session as any).nonce === nonce;
    if (valid) {
      delete (session as any).nonce;
    }
    return valid;
  }

  cleanupSessions(maxAgeMs = 30 * 60 * 1000): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastSeen > maxAgeMs) {
        this.sessions.delete(id);
      }
    }
  }
}
