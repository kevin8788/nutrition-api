import { Injectable } from '@nestjs/common';
import { user_profile } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: bigint): Promise<user_profile | null> {
    return this.prisma.user_profile.findFirst({ where: { user_id: userId } });
  }
}
