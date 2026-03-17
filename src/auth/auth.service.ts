import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import configuration from '../config/configuration';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponse, AuthUser, JwtPayload } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  private readonly users = new Map<string, AuthUser>();
  private readonly config = configuration();

  constructor(private readonly jwtService: JwtService) {}

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

    return this.generateToken(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = this.findByEmail(loginDto.email);

    if (!user || user.password !== loginDto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async validateUser(userId: string): Promise<AuthUser | null> {
    return this.users.get(userId) ?? null;
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

  private generateToken(user: AuthUser): AuthResponse {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
