import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const id = BigInt(userId);

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        user_profile: { take: 1 },
        settings: { take: 1 },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id.toString(),
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      gender: user.gender,
      dob: user.dob,
      created_at: user.created_at,
      profile: user.user_profile[0] ? this.formatProfile(user.user_profile[0]) : null,
      settings: user.settings[0] ? this.formatSettings(user.settings[0]) : null,
    };
  }

  async getProfile(userId: string) {
    const id = BigInt(userId);

    const profile = await this.prisma.user_profile.findFirst({
      where: { user_id: id },
    });

    if (!profile) return null;
    return this.formatProfile(profile);
  }

  async upsertProfile(userId: string, dto: UpdateProfileDto) {
    const id = BigInt(userId);

    const existing = await this.prisma.user_profile.findFirst({
      where: { user_id: id },
    });

    const data = {
      ...(dto.weight !== undefined && { weight: dto.weight }),
      ...(dto.height !== undefined && { height: dto.height }),
      ...(dto.activity_level !== undefined && { activity_level: dto.activity_level }),
      ...(dto.daily_walking_minutes !== undefined && {
        daily_walking_minutes: BigInt(dto.daily_walking_minutes),
      }),
      ...(dto.has_run_before !== undefined && { has_run_before: dto.has_run_before }),
      ...(dto.days_per_week !== undefined && { days_per_week: dto.days_per_week }),
      ...(dto.preferred_location !== undefined && { preferred_location: dto.preferred_location }),
      ...(dto.goal_type !== undefined && { goal_type: dto.goal_type }),
      ...(dto.intensity_preference !== undefined && {
        intensity_preference: dto.intensity_preference,
      }),
      updated_at: new Date(),
    };

    if (existing) {
      const updated = await this.prisma.user_profile.update({
        where: { id: existing.id },
        data,
      });
      return this.formatProfile(updated);
    }

    const created = await this.prisma.user_profile.create({
      data: { user_id: id, ...data },
    });
    return this.formatProfile(created);
  }

  async getSettings(userId: string) {
    const id = BigInt(userId);

    const settings = await this.prisma.settings.findFirst({
      where: { user_id: id },
    });

    if (!settings) return null;
    return this.formatSettings(settings);
  }

  async upsertSettings(userId: string, dto: UpdateSettingsDto) {
    const id = BigInt(userId);

    const existing = await this.prisma.settings.findFirst({
      where: { user_id: id },
    });

    const data = {
      ...(dto.language !== undefined && { language: dto.language }),
      ...(dto.dark_mode !== undefined && { dark_mode: dto.dark_mode }),
      ...(dto.notifications_enabled !== undefined && {
        notifications_enabled: dto.notifications_enabled,
      }),
      ...(dto.audio_cues_enabled !== undefined && { audio_cues_enabled: dto.audio_cues_enabled }),
      ...(dto.voice_coaching_enabled !== undefined && {
        voice_coaching_enabled: dto.voice_coaching_enabled,
      }),
      ...(dto.location_tracking_enabled !== undefined && {
        location_tracking_enabled: dto.location_tracking_enabled,
      }),
      ...(dto.weight_unit !== undefined && { weight_unit: dto.weight_unit }),
      ...(dto.height_unit !== undefined && { height_unit: dto.height_unit }),
      ...(dto.distance_unit !== undefined && { distance_unit: dto.distance_unit }),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const updated = await this.prisma.settings.update({
        where: { id_user_id: { id: existing.id, user_id: id } },
        data,
      });
      return this.formatSettings(updated);
    }

    const created = await this.prisma.settings.create({
      data: { user_id: id, ...data },
    });
    return this.formatSettings(created);
  }

  async getNutritionLogs(userId: string, limit: number, offset: number) {
    const id = BigInt(userId);

    const [logs, total] = await Promise.all([
      this.prisma.nutrition_log.findMany({
        where: { user_id: id },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.nutrition_log.count({ where: { user_id: id } }),
    ]);

    return {
      total,
      limit,
      offset,
      logs: logs.map((log) => ({
        id: log.id.toString(),
        food_name: log.food_name,
        serving_size: log.serving_size,
        nutrients: log.nutrients,
        description: log.description,
        created_at: log.created_at,
      })),
    };
  }

  private formatProfile(p: any) {
    return {
      id: p.id.toString(),
      weight: p.weight,
      height: p.height,
      activity_level: p.activity_level,
      daily_walking_minutes: p.daily_walking_minutes?.toString() ?? null,
      has_run_before: p.has_run_before,
      days_per_week: p.days_per_week,
      preferred_location: p.preferred_location,
      goal_type: p.goal_type,
      intensity_preference: p.intensity_preference,
      updated_at: p.updated_at,
    };
  }

  private formatSettings(s: any) {
    return {
      id: s.id.toString(),
      language: s.language,
      dark_mode: s.dark_mode,
      notifications_enabled: s.notifications_enabled,
      audio_cues_enabled: s.audio_cues_enabled,
      voice_coaching_enabled: s.voice_coaching_enabled,
      location_tracking_enabled: s.location_tracking_enabled,
      weight_unit: s.weight_unit,
      height_unit: s.height_unit,
      distance_unit: s.distance_unit,
    };
  }
}
