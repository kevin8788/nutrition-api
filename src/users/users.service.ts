import { Injectable } from '@nestjs/common';
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

  async getLogins(userId: string): Promise<{ date: string | null }[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      select: { last_login: true },
    });

    if (!user?.last_login) return [];
    return [{ date: user.last_login.toISOString() }];
  }

  async getSettings(userId: string): Promise<SettingsResponse> {
    const settings = await this.settingsRepository.findByUserId(BigInt(userId));

    if (!settings) {
      return this.mapSettings(userId, {
        language: 'en',
        dark_mode: false,
        notifications_enabled: true,
        audio_cues_enabled: false,
        voice_coaching_enabled: false,
        location_tracking_enabled: false,
        weight_unit: 'kg',
        height_unit: 'cm',
        distance_unit: 'km',
        updated_at: null,
      });
    }

    return this.mapSettings(userId, settings);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<SettingsResponse> {
    const mapped = this.mapFrontendFields(dto);
    const settings = await this.settingsRepository.upsert(BigInt(userId), mapped);
    return this.mapSettings(userId, settings);
  }

  private mapFrontendFields(dto: UpdateSettingsDto): Omit<UpdateSettingsDto, 'userid' | 'unitSystem' | 'notifications' | 'dailyReminder'> {
    const { userid: _userid, unitSystem, notifications, dailyReminder: _dailyReminder, ...rest } = dto;

    if (unitSystem !== undefined) {
      rest.weight_unit = rest.weight_unit ?? unitSystem;
      rest.height_unit = rest.height_unit ?? unitSystem;
      rest.distance_unit = rest.distance_unit ?? unitSystem;
    }

    if (notifications !== undefined) {
      rest.notifications_enabled = rest.notifications_enabled ?? notifications;
    }

    return rest;
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
