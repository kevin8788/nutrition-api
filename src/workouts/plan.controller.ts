import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePlannedWorkoutDto } from './dto/create-planned-workout.dto';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { PlanDateQueryDto } from './dto/plan-date-query.dto';
import {
  GeneratedPlanResponse,
  PlannedWorkoutResponse,
  TodayPlanResponse,
  WeekPlanResponse,
} from './interfaces/workout-responses.interface';
import { PlanService } from './plan.service';

type AuthenticatedUser = { userId: string; email: string };

@Controller('plan')
@UseGuards(JwtAuthGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get('today')
  getToday(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PlanDateQueryDto,
  ): Promise<TodayPlanResponse> {
    return this.planService.getToday(user.userId, query.date);
  }

  @Get('week')
  getWeek(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PlanDateQueryDto,
  ): Promise<WeekPlanResponse> {
    return this.planService.getWeek(user.userId, query.date);
  }

  @Post('generate')
  generate(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GeneratePlanDto,
  ): Promise<GeneratedPlanResponse> {
    return this.planService.generate(user.userId, dto);
  }

  @Post('sessions')
  createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlannedWorkoutDto,
  ): Promise<PlannedWorkoutResponse> {
    return this.planService.createSession(user.userId, dto);
  }
}
