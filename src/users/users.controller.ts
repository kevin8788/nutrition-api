import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { SettingsResponse } from './interfaces/settings.interface';
import { UserProfileResponse } from './interfaces/user-profile.interface';
import { UsersService } from './users.service';

type AuthenticatedUser = { userId: string; email: string };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('logins')
  getLogins(@CurrentUser() user: AuthenticatedUser): Promise<{ date: string | null }[]> {
    return this.usersService.getLogins(user.userId);
  }

  @Post('logins')
  @HttpCode(HttpStatus.OK)
  recordLogin(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.usersService.updateLastLogin(user.userId);
  }

  @Get('settings')
  getSettings(@CurrentUser() user: AuthenticatedUser): Promise<SettingsResponse> {
    return this.usersService.getSettings(user.userId);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponse> {
    return this.usersService.updateSettings(user.userId, dto);
  }

  @Put('settings')
  replaceSettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponse> {
    return this.usersService.updateSettings(user.userId, dto);
  }

  @Get('profile')
  getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: true; data: UserProfileResponse }> {
    return this.usersService.getProfile(user.userId);
  }

  @Put('profile')
  upsertProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateUserProfileDto,
  ): Promise<{ success: true; data: UserProfileResponse }> {
    return this.usersService.upsertProfile(user.userId, dto);
  }
}
