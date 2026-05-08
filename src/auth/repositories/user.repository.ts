import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateUserData {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  dob: Date | null;
  google_uid: string;
  gender?: string | null;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByGoogleUid(googleUid: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { google_uid: googleUid } });
  }

  async findActiveByGoogleUid(googleUid: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { google_uid: googleUid, is_active: true },
    });
  }

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updateLastLogin(id: bigint): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { last_login: new Date() },
    });
  }

  async findById(id: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }
}
