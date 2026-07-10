import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AnthropicModule } from './anthropic/anthropic.module';
import { AuthModule } from './auth/auth.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { WorkoutsModule } from './workouts/workouts.module';

const config = configuration();

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: config.rateLimit.ttl,
        limit: config.rateLimit.limit,
      },
    ]),
    PrismaModule,
    AuthModule,
    NutritionModule,
    AnthropicModule,
    HealthModule,
    WorkoutsModule,
    ProfileModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
