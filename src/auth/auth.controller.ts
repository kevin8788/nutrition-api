import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleSignupDto } from './dto/google-signup.dto';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthResponse } from './interfaces/auth-response.interface';
import { DecodedFirebaseUser } from './interfaces/firebase-user.interface';
import { UserProfileResponse } from './interfaces/user-profile-response.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('google/signup')
  @UseGuards(FirebaseAuthGuard)
  googleSignup(
    @Request() req: { user: DecodedFirebaseUser },
    @Body() dto: GoogleSignupDto,
  ): Promise<AuthResponse> {
    return this.authService.googleSignup(req.user, dto);
  }

  @Post('google/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  googleLogin(@Request() req: { user: DecodedFirebaseUser }): Promise<AuthResponse> {
    return this.authService.googleLogin(req.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() currentUser: { userId: string; email: string }): Promise<UserProfileResponse> {
    return this.authService.getProfile(currentUser.userId);
  }

  @Get('api-key-test')
  @UseGuards(ApiKeyAuthGuard)
  apiKeyTest(): { authenticated: boolean; authType: string } {
    return {
      authenticated: true,
      authType: 'apiKey',
    };
  }
}
