import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePlannedWorkoutDto } from './dto/create-planned-workout.dto';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { PlanDateQueryDto } from './dto/plan-date-query.dto';
import { SaveAiPlanDto } from './dto/save-ai-plan.dto';
import { AiWorkoutPlan } from './interfaces/ai-plan.interface';
import {
  PlannedWorkoutResponse,
  TodayPlanResponse,
  WeekPlanResponse,
  WorkoutSessionResponse,
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

  @Post('sessions')
  createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePlannedWorkoutDto,
  ): Promise<PlannedWorkoutResponse> {
    return this.planService.createSession(user.userId, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  saveAiPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveAiPlanDto,
  ): Promise<{ success: boolean; savedCount: number }> {
    return this.planService.saveAiPlan(user.userId, dto);
  }

  @Post('log')
  @HttpCode(HttpStatus.CREATED)
  logWorkout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogWorkoutDto,
  ): Promise<WorkoutSessionResponse> {
    return this.planService.logWorkout(user.userId, dto);
  }

  @Post('generate-ai')
  @HttpCode(HttpStatus.OK)
  generateAiPlan(@CurrentUser() user: AuthenticatedUser): Promise<{ success: boolean; data: AiWorkoutPlan }> {
    return this.planService.generateAiPlan(user.userId);
  }
}
