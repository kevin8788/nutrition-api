import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SaveOnboardingDto } from './dto/save-onboarding.dto';
import { ProfileResponse } from './interfaces/profile-response.interface';
import { ProfileService } from './profile.service';

type AuthenticatedUser = { userId: string; email: string };

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<ProfileResponse> {
    return this.profileService.getProfile(user.userId);
  }

  @Put('onboarding')
  saveOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveOnboardingDto,
  ): Promise<ProfileResponse> {
    return this.profileService.saveOnboarding(user.userId, dto);
  }
}
