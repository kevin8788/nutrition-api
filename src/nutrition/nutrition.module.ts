import { Module } from '@nestjs/common';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { AuthModule } from '../auth/auth.module';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';

@Module({
  imports: [AnthropicModule, AuthModule],
  controllers: [NutritionController],
  providers: [NutritionService],
})
export class NutritionModule {}
