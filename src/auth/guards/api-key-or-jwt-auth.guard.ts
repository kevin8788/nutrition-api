import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/auth-response.interface';

type AuthenticatedRequest = Request & {
  authClientId?: string;
  user?: JwtPayload;
};

@Injectable()
export class ApiKeyOrJwtAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = this.extractApiKey(request);

    if (apiKey !== undefined) {
      const configuredApiKey = this.authService.getConfiguredApiKey();

      if (!configuredApiKey) {
        throw new UnauthorizedException('API key auth is not configured');
      }

      if (!this.authService.validateApiKey(apiKey)) {
        throw new UnauthorizedException('Invalid API key');
      }

      request.authClientId = `apiKey:${request.ip || 'unknown'}`;
      return true;
    }

    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = payload;
    request.authClientId = `user:${payload.sub}`;
    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    const headerValue = request.header('x-api-key') || request.header('api-key');
    if (headerValue) {
      return headerValue;
    }

    const authorization = request.header('authorization');
    if (!authorization) {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() === 'apikey' && token) {
      return token;
    }

    return undefined;
  }

  private extractBearerToken(request: Request): string | undefined {
    const authorization = request.header('authorization');
    if (!authorization) {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }
}
