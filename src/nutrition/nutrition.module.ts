import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnthropicModule } from '../anthropic/anthropic.module';
import { AuthModule } from '../auth/auth.module';
import { NutritionLog } from '../database/nutrition-log.entity';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';

@Module({
  imports: [AnthropicModule, AuthModule, TypeOrmModule.forFeature([NutritionLog])],
  controllers: [NutritionController],
  providers: [NutritionService],
})
export class NutritionModule {}
