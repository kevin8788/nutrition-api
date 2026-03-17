import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';

type ApiKeyRequest = Request & {
  authClientId?: string;
};

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const apiKey = this.extractApiKey(request);
    const configuredApiKey = this.authService.getConfiguredApiKey();

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    if (!configuredApiKey) {
      throw new UnauthorizedException('API key auth is not configured');
    }

    if (!this.authService.validateApiKey(apiKey)) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.authClientId = `apiKey:${request.ip || 'unknown'}`;
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
}
