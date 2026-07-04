import { Module } from '@nestjs/common';
import { NonceController } from './nonce.controller';

@Module({
  controllers: [NonceController],
})
export class NonceModule {}
