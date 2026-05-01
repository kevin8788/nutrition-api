import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyOrJwtAuthGuard } from '../auth/guards/api-key-or-jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/auth-response.interface';
import { AnalyzeImageDto } from './dto/analyze-image.dto';
import { NutritionResponse } from './interfaces/nutrition-response.interface';
import { NutritionService } from './nutrition.service';

type NutritionRequest = Request & {
  authClientId?: string;
  user?: JwtPayload;
};

@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Post('analyze')
  @UseGuards(ApiKeyOrJwtAuthGuard)
  analyze(
    @Body() dto: AnalyzeImageDto,
    @Req() request: NutritionRequest,
  ): Promise<NutritionResponse> {
    const clientKey = request.authClientId ?? `ip:${request.ip || 'unknown'}`;
    const userId = request.user?.sub;
    return this.nutritionService.analyzeImage(dto, clientKey, userId);
  }
}
