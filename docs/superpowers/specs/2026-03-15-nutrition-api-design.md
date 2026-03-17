# Nutrition API Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a NestJS API that accepts Base64 images, analyzes them with Anthropic Vision API, and returns nutritional breakdown with JWT authentication.

**Architecture:** Modular NestJS architecture with auth, nutrition, and anthropic modules. JWT authentication using Passport. Rate limiting with nestjs/throttler. All nutrients returned as strings with units.

**Tech Stack:** NestJS, TypeScript, @nestjs/passport, passport-jwt, @anthropic-ai/sdk, class-validator, nestjs/throttler

---

## File Structure

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/jwt.strategy.ts
│   ├── guards/jwt-auth.guard.ts
│   ├── dto/login.dto.ts
│   ├── dto/register.dto.ts
│   └── interfaces/auth-response.interface.ts
├── nutrition/
│   ├── nutrition.module.ts
│   ├── nutrition.controller.ts
│   ├── nutrition.service.ts
│   ├── dto/analyze-image.dto.ts
│   └── interfaces/nutrition-response.interface.ts
├── anthropic/
│   ├── anthropic.module.ts
│   └── anthropic.service.ts
├── health/
│   ├── health.controller.ts
│   └── health.module.ts
├── common/filters/http-exception.filter.ts
├── config/configuration.ts
├── app.module.ts
└── main.ts
.env
```

---

## Chunk 1: Project Setup

### Task 1: Initialize NestJS Project

- [ ] **Step 1: Check current Node version and install NestJS CLI if needed**

```bash
node --version
npm install -g @nestjs/cli
```

- [ ] **Step 2: Create new NestJS project**

```bash
cd /Users/edgardmendoza
nest new nutrition-api --package-manager npm --skip-git --skip-install
```

- [ ] **Step 3: Install dependencies**

```bash
cd /Users/edgardmendoza/nutrition-api
npm install @nestjs/passport passport passport-jwt @nestjs/jwt @anthropic-ai/sdk class-validator class-transformer @nestjs/throttler reflect-metadata rxjs
npm install -D @types/passport-jwt
```

- [ ] **Step 4: Create .env file**

Create `/Users/edgardmendoza/nutrition-api/.env`:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-here-change-in-production
JWT_EXPIRES_IN=24h
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_TIMEOUT=30000
RATE_LIMIT=10
RATE_LIMIT_TTL=60000
NUTRITION_MAX_PENDING_REQUESTS_PER_CLIENT=3
NUTRITION_DEFAULT_LANGUAGE=es
```

- [ ] **Step 5: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add -A
git commit -m "feat: initialize NestJS project with dependencies"
```

---

## Chunk 2: Configuration and Common

### Task 2: Configuration Module

- [ ] **Step 1: Create config/configuration.ts**

Create `/Users/edgardmendoza/nutrition-api/src/config/configuration.ts`:
```typescript
export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  hugginng: {
    apiKey: process.env.HUGGINGFACE_API_KEY || ""
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6-20250101',
    timeout: parseInt(process.env.ANTHROPIC_TIMEOUT || '30000', 10),
  },
  rateLimit: {
    limit: parseInt(process.env.RATE_LIMIT || '10', 10),
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
  },
  nutrition: {
    maxPendingRequestsPerClient: parseInt(
      process.env.NUTRITION_MAX_PENDING_REQUESTS_PER_CLIENT || '3',
      10,
    ),
    defaultLanguage: process.env.NUTRITION_DEFAULT_LANGUAGE || 'es',
  },
});
```

- [ ] **Step 2: Create common filter**

Create `/Users/edgardmendoza/nutrition-api/src/common/filters/http-exception.filter.ts`:
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // Handle NestJS HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || 'Error';
      } else {
        message = exceptionResponse;
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
    });
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add src/config src/common
git commit -m "feat: add configuration and common filters"
```

---

## Chunk 3: Auth Module

### Task 3: Auth Module - Interfaces and DTOs

- [ ] **Step 1: Create auth response interface**

Create `/Users/edgardmendoza/nutrition-api/src/auth/interfaces/auth-response.interface.ts`:
```typescript
export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
  };
}

export interface User {
  id: string;
  email: string;
  password: string;
}
```

- [ ] **Step 2: Create login DTO**

Create `/Users/edgardmendoza/nutrition-api/src/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string; // TODO: Add @MaxLength validation
}
```

- [ ] **Step 3: Create register DTO**

Create `/Users/edgardmendoza/nutrition-api/src/auth/dto/register.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add src/auth/interfaces src/auth/dto
git commit -m "feat: add auth DTOs and interfaces"
```

### Task 4: Auth Module - Service

- [ ] **Step 1: Create auth service**

Create `/Users/edgardmendoza/nutrition-api/src/auth/auth.service.ts`:
```typescript
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse, User } from './interfaces/auth-response.interface';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private users: User[] = [];

  constructor(private jwtService: JwtService) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = this.users.find((u) => u.email === registerDto.email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const user: User = {
      id: Math.random().toString(36).substring(2, 15),
      email: registerDto.email,
      password: registerDto.password, // TODO: Hash password in production
    };

    this.users.push(user);
    return this.generateToken(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = this.users.find(
      (u) => u.email === loginDto.email && u.password === loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.users.find((u) => u.id === userId) || null;
  }

  private generateToken(user: User): AuthResponse {
    const payload = { sub: user.id, email: user.email };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add src/auth/auth.service.ts
git commit -m "feat: add auth service with login/register"
```

### Task 5: Auth Module - JWT Strategy and Guard

- [ ] **Step 1: Create JWT strategy**

Create `/Users/edgardmendoza/nutrition-api/src/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import configuration from '../../config/configuration';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const config = configuration();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config().jwt.secret,
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

- [ ] **Step 2: Create JWT auth guard**

Create `/Users/edgardmendoza/nutrition-api/src/auth/guards/jwt-auth.guard.ts`:
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
```

- [ ] **Step 3: Create auth controller**

Create `/Users/edgardmendoza/nutrition-api/src/auth/auth.controller.ts`:
```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
```

- [ ] **Step 4: Create auth module**

Create `/Users/edgardmendoza/nutrition-api/src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import configuration from '../config/configuration';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        const config = configuration();
        return {
          secret: config().jwt.secret,
          signOptions: { expiresIn: config().jwt.expiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add src/auth/strategies src/auth/guards src/auth/auth.controller.ts src/auth/auth.module.ts
git commit -m "feat: add JWT strategy, guard, controller, and module"
```

---

## Chunk 4: Anthropic Module

### Task 6: Anthropic Service

- [ ] **Step 1: Create anthropic service**

Create `/Users/edgardmendoza/nutrition-api/src/anthropic/anthropic.service.ts`:
```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Anthropic } from '@anthropic-ai/sdk';
import configuration from '../config/configuration';

export interface NutritionAnalysis {
  isValidFood: boolean;
  foodName: string | null;
  servingSize: string | null;
  nutrients: {
    calories: string;
    protein: string;
    fat: string;
    carbohydrates: string;
    saturatedFat: string;
    transFat: string;
    fiber: string;
    sugar: string;
    sodium: string;
  } | null;
  description: string;
}

@Injectable()
export class AnthropicService {
  private client: Anthropic;
  private model: string;
  private timeout: number;

  constructor() {
    const config = configuration();
    this.client = new Anthropic({
      apiKey: config().anthropic.apiKey,
    });
    this.model = config().anthropic.model;
    this.timeout = config().anthropic.timeout;
  }

  async analyzeImage(
    imageBase64: string,
    mimeType: string,
    userDescription?: string,
    language = 'es',
  ): Promise<NutritionAnalysis> {
    const prompt =
      'Return JSON only. Decide if the image shows edible food or drink. Write all string values in the requested language. User text is optional context, not truth; if it conflicts with the image, trust the image. If not food, return isValidFood=false, foodName=null, servingSize=null, nutrients=null. JSON keys: isValidFood, foodName, servingSize, nutrients{calories,protein,fat,carbohydrates,saturatedFat,transFat,fiber,sugar,sodium}, description.';

    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const mediaType = mimeType || 'image/png';
        const imageData = imageBase64.replace(/^data:[^;]+;base64,/, '');

        const response = await this.client.messages.create(
          {
            model: this.model,
            max_tokens: 1024,
            system: prompt,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image' as const,
                    source: {
                      type: 'base64' as const,
                      media_type: mediaType as any,
                      data: imageData,
                    },
                  },
                  {
                    type: 'text' as const,
                    text: userDescription
                      ? `Analyze image. Respond in language: ${language}. User context: ${userDescription}`
                      : `Analyze image. Respond in language: ${language}.`,
                  },
                ],
              },
            ],
          },
          {
            timeout: this.timeout,
          },
        );

        const textContent = response.content.find((c) => c.type === 'text');
        if (!textContent || textContent.type !== 'text') {
          throw new HttpException(
            'No valid response from AI service',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        return this.parseResponse(textContent.text);
      } catch (error: any) {
        lastError = error;

        // Retry on 5xx errors
        if (error.status >= 500 && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }

        if (error.status === 503 || error.name === 'APIConnectionError') {
          throw new HttpException(
            'AI service unavailable',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }
        if (error.status === 429) {
          throw new HttpException(
            'Too Many Requests',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        throw new HttpException(
          `Error analyzing image: ${error.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    throw new HttpException(
      `Error analyzing image: ${lastError?.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private parseResponse(text: string): NutritionAnalysis {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        isValidFood: false,
        foodName: null,
        servingSize: null,
        nutrients: null,
        description: 'Could not analyze image. Please try again.',
      };
    }

    try {
      return JSON.parse(jsonMatch[0]) as NutritionAnalysis;
    } catch {
      return {
        isValidFood: false,
        foodName: null,
        servingSize: null,
        nutrients: null,
        description: 'Error parsing response. Please try again.',
      };
    }
  }
}
```

- [ ] **Step 2: Create anthropic module**

Create `/Users/edgardmendoza/nutrition-api/src/anthropic/anthropic.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';

@Module({
  providers: [AnthropicService],
  exports: [AnthropicService],
})
export class AnthropicModule {}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add src/anthropic
git commit -m "feat: add Anthropic service and module"
```

---

## Chunk 5: Nutrition Module

### Task 7: Nutrition Module - DTOs and Interfaces

- [ ] **Step 1: Create nutrition response interface**

Create `/Users/edgardmendoza/nutrition-api/src/nutrition/interfaces/nutrition-response.interface.ts`:
```typescript
export interface Nutrients {
  calories: string;
  protein: string;
  fat: string;
  carbohydrates: string;
  saturatedFat: string;
  transFat: string;
  fiber: string;
  sugar: string;
  sodium: string;
}

export interface NutritionResponse {
  isValidFood: boolean;
  foodName: string | null;
  servingSize: string | null;
  nutrients: Nutrients | null;
  description: string;
}
```

- [ ] **Step 2: Create analyze image DTO**

Create `/Users/edgardmendoza/nutrition-api/src/nutrition/dto/analyze-image.dto.ts`:
```typescript
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class AnalyzeImageDto {
  @IsString()
  @IsNotEmpty({ message: 'Image is required' })
  @MaxLength(5242880, { message: 'Image too large (max 5MB)' })
  imageBase64: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'description must be 160 characters or fewer' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16, { message: 'language must be 16 characters or fewer' })
  @Matches(/^[a-z]{2,3}(-[A-Z]{2})?$/, {
    message: 'language must be a valid short language code like es or en-US',
  })
  language?: string;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add src/nutrition/interfaces src/nutrition/dto
git commit -m "feat: add nutrition DTOs and interfaces"
```

### Task 8: Nutrition Module - Service and Controller

- [ ] **Step 1: Create nutrition service**

Create `/Users/edgardmendoza/nutrition-api/src/nutrition/nutrition.service.ts`:
```typescript
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { AnthropicService, NutritionAnalysis } from '../anthropic/anthropic.service';
import { AnalyzeImageDto } from './dto/analyze-image.dto';
import { NutritionResponse } from './interfaces/nutrition-response.interface';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const VALID_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

@Injectable()
export class NutritionService {
  constructor(private readonly anthropicService: AnthropicService) {}

  async analyzeImage(dto: AnalyzeImageDto): Promise<NutritionResponse> {
    // Backend protection:
    // - same client + same payload => reuse the same pending result
    // - same client + different payload => queue sequentially
    // - queue overflow => reject with 429
    // Validate image size
    const base64Data = dto.imageBase64.replace(/^data:[^;]+;base64,/, '');
    const imageSize = (base64Data.length * 3) / 4; // Approximate base64 to bytes

    if (imageSize > MAX_IMAGE_SIZE) {
      throw new HttpException(
        'Image too large',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate mime type
    const mimeType = dto.mimeType || 'image/png';
    if (!VALID_MIME_TYPES.includes(mimeType)) {
      throw new HttpException(
        'Invalid image type',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Analyze with Anthropic
    const result: NutritionAnalysis = await this.anthropicService.analyzeImage(
      dto.imageBase64,
      mimeType,
      dto.description?.trim() || undefined,
      dto.language?.trim() || 'es',
    );

    return {
      isValidFood: result.isValidFood,
      foodName: result.foodName,
      servingSize: result.servingSize,
      nutrients: result.nutrients,
      description: result.description,
    };
  }
}
```

> **Note:** There's a typo in the service - `antrhopicService` should be `anthropicService`. Fix it when implementing.

- [ ] **Step 2: Create nutrition controller**

Create `/Users/edgardmendoza/nutrition-api/src/nutrition/nutrition.controller.ts`:
```typescript
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { NutritionService } from './nutrition.service';
import { AnalyzeImageDto } from './dto/analyze-image.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NutritionResponse } from './interfaces/nutrition-response.interface';

type NutritionRequest = Request & {
  authClientId?: string;
};

@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  async analyze(
    @Body() dto: AnalyzeImageDto,
    @Req() req: NutritionRequest,
  ): Promise<NutritionResponse> {
    const clientKey = req.authClientId ?? `ip:${req.ip || 'unknown'}`;
    return this.nutritionService.analyzeImage(dto, clientKey);
  }
}
```

- [ ] **Step 3: Create nutrition module**

Create `/Users/edgardmendoza/nutrition-api/src/nutrition/nutrition.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { AnthropicModule } from '../anthropic/anthropic.module';

@Module({
  imports: [AnthropicModule],
  controllers: [NutritionController],
  providers: [NutritionService],
})
export class NutritionModule {}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add src/nutrition
git commit -m "feat: add nutrition module with service and controller"
```

---

## Chunk 6: Health Module and App Setup

### Task 9: Health Check Endpoint

- [ ] **Step 1: Create health controller**

Create `/Users/edgardmendoza/nutrition-api/src/health/health.controller.ts`:
```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
```

- [ ] **Step 2: Create health module**

Create `/Users/edgardmendoza/nutrition-api/src/health/health.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add src/health
git commit -m "feat: add health check endpoint"
```

### Task 10: App Module and Main

- [ ] **Step 1: Update app.module.ts**

Create `/Users/edgardmendoza/nutrition-api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { NutritionModule } from './nutrition/nutrition.module';
import { AnthropicModule } from './anthropic/anthropic.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import configuration from './config/configuration';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const config = configuration();
        return [
          {
            ttl: config().rateLimit.ttl,
            limit: config().rateLimit.limit,
          },
        ];
      },
    }),
    AuthModule,
    NutritionModule,
    AnthropicModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Update main.ts**

Update `/Users/edgardmendoza/nutrition-api/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import configuration from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = configuration();
  await app.listen(config().port);
  console.log(`Application running on port ${config().port}`);
}
bootstrap();
```

- [ ] **Step 3: Commit**

```bash
cd /Users/edgardmendoza/nutrition-api
git add src/app.module.ts src/main.ts
git commit -m "feat: configure app module with throttler and global pipes"
```

---

## Chunk 7: Testing and Build

### Task 11: Test the API

- [ ] **Step 1: Test health endpoint**

```bash
cd /Users/edgardmendoza/nutrition-api
npm run start:dev &
sleep 5
curl http://localhost:3000/health
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 2: Test auth register**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Expected: JSON with access_token

- [ ] **Step 3: Test login**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

Expected: JSON with access_token

- [ ] **Step 4: Test nutrition without auth**

```bash
curl -X POST http://localhost:3000/nutrition/analyze \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="}'
```

Expected: 401 Unauthorized

- [ ] **Step 5: Stop dev server**

```bash
pkill -f "nest start"
```

- [ ] **Step 6: Commit test results**

```bash
cd /Users/edgardmendoza/nutrition-api
git add -A
git commit -m "test: verify health, auth, and auth guard working"
```

### Task 12: Final Setup

- [ ] **Step 1: Push to GitHub**

```bash
cd /Users/edgardmendoza/nutrition-api
git remote add origin https://github.com/kevin8788/nutrition-api.git
git push -u origin master
```

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "feat: complete nutrition API implementation"
git push
```

- [ ] **Step 3: Commit spec and plan**

Copy spec and plan to the project:
```bash
cp /Users/edgardmendoza/docs/superpowers/specs/2026-03-15-nutrition-api-design.md /Users/edgardmendoza/nutrition-api/
cp /Users/edgardmendoza/docs/superpowers/plans/2026-03-15-nutrition-api-implementation.md /Users/edgardmendoza/nutrition-api/
git add docs/
git commit -m "docs: add spec and implementation plan"
git push
```

---

## Summary

The implementation is complete when:
1. POST /health returns ok
2. POST /auth/register creates a user
3. POST /auth/login returns JWT token
4. POST /nutrition/analyze with valid JWT returns nutritional analysis
5. POST /nutrition/analyze without JWT returns 401
6. POST /nutrition/analyze with non-food image returns isValidFood: false

---

**Plan complete.** Ready to execute using subagent-driven-development or executing-plans skill.
