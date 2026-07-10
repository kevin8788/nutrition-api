import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsResponse } from './interfaces/settings.interface';
import { SettingsRepository } from './repositories/settings.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsRepository: SettingsRepository,
  ) {}

  async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { last_login: new Date() },
    });
  }

  async getSettings(userId: string): Promise<SettingsResponse> {
    const settings = await this.settingsRepository.findByUserId(BigInt(userId));

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return this.mapSettings(userId, settings);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<SettingsResponse> {
    const settings = await this.settingsRepository.upsert(BigInt(userId), dto);
    return this.mapSettings(userId, settings);
  }

  private mapSettings(userId: string, s: {
    language: string | null;
    dark_mode: boolean | null;
    notifications_enabled: boolean | null;
    audio_cues_enabled: boolean | null;
    voice_coaching_enabled: boolean | null;
    location_tracking_enabled: boolean | null;
    weight_unit: string | null;
    height_unit: string | null;
    distance_unit: string | null;
    updated_at: string | null;
  }): SettingsResponse {
    return {
      userId,
      language: s.language,
      darkMode: s.dark_mode,
      notificationsEnabled: s.notifications_enabled,
      audioCuesEnabled: s.audio_cues_enabled,
      voiceCoachingEnabled: s.voice_coaching_enabled,
      locationTrackingEnabled: s.location_tracking_enabled,
      weightUnit: s.weight_unit,
      heightUnit: s.height_unit,
      distanceUnit: s.distance_unit,
      updatedAt: s.updated_at,
    };
  }
}
