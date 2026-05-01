import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NutritionLog } from '../database/nutrition-log.entity';
import { UserProfile } from '../database/user-profile.entity';
import { User } from '../database/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    @InjectRepository(NutritionLog)
    private readonly nutritionLogRepository: Repository<NutritionLog>,
  ) {}

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    if (!user) throw new NotFoundException('User not found');
    return this.formatUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });
    if (!user) throw new NotFoundException('User not found');

    if (!user.profile) {
      const profile = this.profileRepository.create({ user, ...dto });
      await this.profileRepository.save(profile);
      user.profile = profile;
    } else {
      Object.assign(user.profile, dto);
      await this.profileRepository.save(user.profile);
    }

    return this.formatUser(user);
  }

  async getNutritionLogs(userId: string, limit = 20, offset = 0) {
    const [logs, total] = await this.nutritionLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { logs, total, limit, offset };
  }

  private formatUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            name: user.profile.name,
            age: user.profile.age,
            heightCm: user.profile.heightCm,
            weightKg: user.profile.weightKg,
            gender: user.profile.gender,
            activityLevel: user.profile.activityLevel,
            goal: user.profile.goal,
          }
        : null,
    };
  }
}
