import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Game API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/score returns highScore', () => {
    return request(app.getHttpServer())
      .get('/api/score')
      .expect(200)
      .expect((res: any) => {
        expect(res.body).toHaveProperty('highScore');
        expect(typeof res.body.highScore).toBe('number');
      });
  });

  it('POST /api/game/play returns valid response for rock', () => {
    return request(app.getHttpServer())
      .post('/api/game/play')
      .send({ action: 'rock' })
      .expect(201)
      .expect((res: any) => {
        expect(res.body).toHaveProperty('botAction');
        expect(res.body).toHaveProperty('result');
        expect(res.body).toHaveProperty('yourScore');
        expect(res.body).toHaveProperty('highScore');
        expect(['rock', 'paper', 'scissors']).toContain(res.body.botAction);
        expect(['win', 'lose', 'draw']).toContain(res.body.result);
      });
  });

  it('POST /api/game/play rejects invalid action with 400', () => {
    return request(app.getHttpServer())
      .post('/api/game/play')
      .send({ action: 'invalid' })
      .expect(400);
  });

  it('POST /api/game/play rejects missing action with 400', () => {
    return request(app.getHttpServer())
      .post('/api/game/play')
      .send({})
      .expect(400);
  });
});
