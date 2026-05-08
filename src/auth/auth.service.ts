import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import configuration from '../config/configuration';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleSignupDto } from './dto/google-signup.dto';
import { AuthResponse, AuthUser, JwtPayload } from './interfaces/auth-response.interface';
import { UserProfileResponse } from './interfaces/user-profile-response.interface';
import { DecodedFirebaseUser } from './interfaces/firebase-user.interface';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class AuthService {
  private readonly users = new Map<string, AuthUser>();
  private readonly config = configuration();

  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = this.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user: AuthUser = {
      id: randomUUID(),
      email: registerDto.email.toLowerCase(),
      password: registerDto.password,
    };

    this.users.set(user.id, user);

    return this.generateToken(user.id, user.email);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = this.findByEmail(loginDto.email);

    if (!user || user.password !== loginDto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user.id, user.email);
  }

  async googleSignup(
    firebaseUser: DecodedFirebaseUser,
    dto: GoogleSignupDto,
  ): Promise<AuthResponse> {
    const existing = await this.userRepository.findByGoogleUid(firebaseUser.google_uid);
    if (existing) {
      throw new ConflictException('User already registered');
    }


    

    const created = await this.userRepository.create({
      first_name: dto.first_name,
      last_name: dto.last_name,
      username: dto.username,
      email: firebaseUser.email,
      dob: new Date(dto.dob),
      google_uid: firebaseUser.google_uid,
      gender: dto.gender || null,
    });

    return this.generateToken(created.id.toString(), created.email ?? '');
  }

  async googleLogin(firebaseUser: DecodedFirebaseUser): Promise<AuthResponse> {
    const user = await this.userRepository.findActiveByGoogleUid(firebaseUser.google_uid);

    if (!user) {
      throw new UnauthorizedException('Account not found or inactive');
    }

    // @ts-ignore
    await this.userRepository.updateLastLogin(user.id);

    return this.generateToken(user.id.toString(), user.email ?? '');
  }

  async getProfile(userId: string): Promise<UserProfileResponse> {
    let bigIntId: bigint;
    try {
      bigIntId = BigInt(userId);
    } catch {
      throw new NotFoundException('User not found');
    }

    const user = await this.userRepository.findById(bigIntId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id.toString(),
      email: user.email ?? '',
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      username: user.username ?? null,
      gender: user.gender ?? null,
      dob: user.dob ? user.dob.toISOString() : null,
      createdAt: user.created_at.toISOString(),
    };
  }

  async validateUser(userId: string): Promise<{ id: string; email: string } | null> {
    const memUser = this.users.get(userId);
    if (memUser) {
      return { id: memUser.id, email: memUser.email };
    }

    try {
      const bigIntId = BigInt(userId);
      const dbUser = await this.userRepository.findById(bigIntId);
      if (dbUser) {
        return { id: dbUser.id.toString(), email: dbUser.email ?? '' };
      }
    } catch {
      // userId is not a valid BigInt, skip DB lookup
    }

    return null;
  }

  getConfiguredApiKey(): string | null {
    const apiKey = this.config.auth.apiKey.trim();
    return apiKey ? apiKey : null;
  }

  validateApiKey(apiKey: string): boolean {
    const configuredApiKey = this.getConfiguredApiKey();
    return configuredApiKey !== null && apiKey === configuredApiKey;
  }

  private findByEmail(email: string): AuthUser | undefined {
    const normalizedEmail = email.toLowerCase();
    return Array.from(this.users.values()).find(
      (candidate) => candidate.email === normalizedEmail,
    );
  }

  private generateToken(id: string, email: string): AuthResponse {
    const payload: JwtPayload = { sub: id, email };

    return {
      access_token: this.jwtService.sign(payload),
      user: { id, email },
    };
  }
}
