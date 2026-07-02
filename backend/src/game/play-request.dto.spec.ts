import { validate } from 'class-validator';
import { PlayRequestDto } from './play-request.dto';

describe('PlayRequestDto', () => {
  it('accepts valid rock action', async () => {
    const dto = new PlayRequestDto();
    dto.action = 'rock';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts valid paper action', async () => {
    const dto = new PlayRequestDto();
    dto.action = 'paper';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts valid scissors action', async () => {
    const dto = new PlayRequestDto();
    dto.action = 'scissors';
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects invalid action', async () => {
    const dto = new PlayRequestDto();
    dto.action = 'invalid';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.isIn).toBeDefined();
  });

  it('rejects empty action', async () => {
    const dto = new PlayRequestDto();
    (dto as any).action = '';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects missing action', async () => {
    const dto = new PlayRequestDto();
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
