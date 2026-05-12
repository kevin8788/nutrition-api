import { Module } from '@nestjs/common';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { ProgramController } from './program.controller';
import { ProgramService } from './program.service';

@Module({
  imports: [AnthropicModule],
  controllers: [ProgramController],
  providers: [ProgramService],
})
export class ProgramModule {}
