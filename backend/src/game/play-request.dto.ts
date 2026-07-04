import { IsIn, IsString, IsNotEmpty, IsUUID } from 'class-validator';
import type { Action } from './game.service';

const VALID_ACTIONS: readonly Action[] = ['rock', 'paper', 'scissors'] as const;

export class PlayRequestDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(VALID_ACTIONS, { message: 'action must be rock, paper, or scissors' })
  action: Action;

  @IsNotEmpty()
  @IsUUID('4')
  nonce: string;
}
