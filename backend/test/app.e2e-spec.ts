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

  it('GET /api/nonce returns a nonce', () => {
    return request(app.getHttpServer())
      .get('/api/nonce')
      .expect(200)
      .expect((res: any) => {
        expect(res.body).toHaveProperty('nonce');
        expect(typeof res.body.nonce).toBe('string');
        expect(res.body.nonce.length).toBeGreaterThan(0);
      });
  });

  it('POST /api/game/play rejects missing nonce with 400', () => {
    return request(app.getHttpServer())
      .post('/api/game/play')
      .send({ action: 'rock' })
      .expect(400);
  });

  it('POST /api/game/play rejects invalid action with 400', () => {
    return request(app.getHttpServer())
      .post('/api/game/play')
      .send({ action: 'invalid', nonce: '550e8400-e29b-41d4-a716-446655440000' })
      .expect(400);
  });

  it('POST /api/game/play rejects missing action with 400', () => {
    return request(app.getHttpServer())
      .post('/api/game/play')
      .send({ nonce: '550e8400-e29b-41d4-a716-446655440000' })
      .expect(400);
  });

  it('full play flow: get nonce then play', async () => {
    const agent = request.agent(app.getHttpServer());

    const nonceRes = await agent.get('/api/nonce').expect(200);
    const nonce = nonceRes.body.nonce;

    await agent
      .post('/api/game/play')
      .send({ action: 'rock', nonce })
      .expect(201)
      .expect((res: any) => {
        expect(res.body).toHaveProperty('botAction');
        expect(res.body).toHaveProperty('result');
        expect(res.body).toHaveProperty('yourScore');
        expect(res.body).toHaveProperty('highScore');
      });
  });
});
