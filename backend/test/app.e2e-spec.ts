import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Game API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/score returns highScore', () => {
    return request(app.getHttpServer())
      .get('/api/score')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('highScore');
        expect(typeof res.body.highScore).toBe('number');
      });
  });

  it('POST /api/game/play returns valid response for rock', () => {
    return request(app.getHttpServer())
      .post('/api/game/play')
      .send({ action: 'rock', currentScore: 0 })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('botAction');
        expect(res.body).toHaveProperty('result');
        expect(res.body).toHaveProperty('yourScore');
        expect(res.body).toHaveProperty('highScore');
        expect(['rock', 'paper', 'scissors']).toContain(res.body.botAction);
        expect(['win', 'lose', 'draw']).toContain(res.body.result);
      });
  });

  it('POST /api/game/play handles paper action', () => {
    return request(app.getHttpServer())
      .post('/api/game/play')
      .send({ action: 'paper', currentScore: 3 })
      .expect(201)
      .expect((res) => {
        expect(res.body.yourScore).toBeGreaterThanOrEqual(0);
      });
  });

  it('POST /api/game/play handles scissors action', () => {
    return request(app.getHttpServer())
      .post('/api/game/play')
      .send({ action: 'scissors', currentScore: 10 })
      .expect(201)
      .expect((res) => {
        expect(res.body.yourScore).toBeGreaterThanOrEqual(0);
      });
  });
});
