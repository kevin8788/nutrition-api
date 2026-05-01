import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnthropicModule } from './anthropic/anthropic.module';
import { AuthModule } from './auth/auth.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import configuration from './config/configuration';
import { NutritionLog } from './database/nutrition-log.entity';
import { UserProfile } from './database/user-profile.entity';
import { User } from './database/user.entity';
import { HealthModule } from './health/health.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { UsersModule } from './users/users.module';

const config = configuration();

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: config.rateLimit.ttl,
        limit: config.rateLimit.limit,
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH || 'fitwalk.db',
      entities: [User, UserProfile, NutritionLog],
      synchronize: true,
    }),
    AuthModule,
    NutritionModule,
    AnthropicModule,
    HealthModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
