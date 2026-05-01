import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from '../config/configuration';
import { User } from '../database/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { ApiKeyOrJwtAuthGuard } from './guards/api-key-or-jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

const config = configuration();

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: config.jwt.secret,
      signOptions: { expiresIn: config.jwt.expiresIn as never },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ApiKeyAuthGuard, ApiKeyOrJwtAuthGuard],
  exports: [AuthService, JwtModule, ApiKeyAuthGuard, ApiKeyOrJwtAuthGuard],
})
export class AuthModule {}
