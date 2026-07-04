export interface IScoreService {
  getHighScore(): number;
  updateHighScore(score: number): number;
  getSession(id: string): { yourScore: number } | undefined;
  createSession(): string;
  setScore(id: string, score: number): void;
  createNonce(sessionId: string): string;
  validateNonce(sessionId: string, nonce: string): boolean;
}
