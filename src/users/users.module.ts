import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserProfileRepository } from '../workouts/repositories/user-profile.repository';
import { SettingsRepository } from './repositories/settings.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, SettingsRepository, UserProfileRepository],
})
export class UsersModule {}
