import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { ScoreService } from '../score/score.service';
import { PlayRequestDto } from './play-request.dto';
import { Action } from './game.service';

describe('GameController', () => {
  let controller: GameController;

  const mockGameService = {
    play: jest.fn().mockReturnValue({
      botAction: 'paper',
      result: 'win',
      yourScore: 1,
      highScore: 1,
    }),
  };

  const mockScoreService = {
    ensureSession: jest.fn().mockReturnValue('session-1'),
    validateNonce: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GameController],
      providers: [
        { provide: GameService, useValue: mockGameService },
        { provide: ScoreService, useValue: mockScoreService },
      ],
    }).compile();

    controller = module.get<GameController>(GameController);
  });

  describe('POST /api/game/play', () => {
    it('delegates to GameService with valid nonce', () => {
      const req = {} as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;

      const dto: PlayRequestDto = { action: 'rock' as Action, nonce: 'valid-nonce' };

      const result = controller.play(dto, req, res);

      expect(result).toEqual({
        botAction: 'paper',
        result: 'win',
        yourScore: 1,
        highScore: 1,
      });
      expect(mockScoreService.validateNonce).toHaveBeenCalledWith('session-1', 'valid-nonce');
    });

    it('throws BadRequestException when nonce is invalid', () => {
      mockScoreService.validateNonce.mockReturnValueOnce(false);
      const req = {} as unknown as Request;
      const res = { cookie: jest.fn() } as unknown as Response;

      const dto: PlayRequestDto = { action: 'rock' as Action, nonce: 'bad-nonce' };

      expect(() =>
        controller.play(dto, req, res),
      ).toThrow(BadRequestException);
    });
  });
});
