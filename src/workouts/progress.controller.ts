import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlanDateQueryDto } from './dto/plan-date-query.dto';
import { UpdateWeeklyGoalDto } from './dto/update-weekly-goal.dto';
import {
  WeeklyGoalResponse,
  WeeklyProgressResponse,
} from './interfaces/workout-responses.interface';
import { ProgressService } from './progress.service';

type AuthenticatedUser = { userId: string; email: string };

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('weekly')
  getWeekly(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PlanDateQueryDto,
  ): Promise<WeeklyProgressResponse> {
    return this.progressService.getWeekly(user.userId, query.date);
  }

  @Get('goals')
  getGoals(@CurrentUser() user: AuthenticatedUser): Promise<WeeklyGoalResponse> {
    return this.progressService.getGoals(user.userId);
  }

  @Put('goals')
  updateGoals(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWeeklyGoalDto,
  ): Promise<WeeklyGoalResponse> {
    return this.progressService.updateGoals(user.userId, dto);
  }
}
