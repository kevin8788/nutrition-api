import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsResponse } from './interfaces/settings.interface';
import { UsersService } from './users.service';

type AuthenticatedUser = { userId: string; email: string };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
