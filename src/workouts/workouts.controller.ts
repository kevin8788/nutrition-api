import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinishWorkoutDto } from './dto/finish-workout.dto';
import { StartWorkoutDto } from './dto/start-workout.dto';
import { UpdateWorkoutMetricsDto } from './dto/update-workout-metrics.dto';
import { WorkoutSessionResponse } from './interfaces/workout-responses.interface';
import { WorkoutsService } from './workouts.service';

type AuthenticatedUser = { userId: string; email: string };

@Controller('workouts')
@UseGuards(JwtAuthGuard)
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post('start')
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartWorkoutDto,
  ): Promise<WorkoutSessionResponse> {
    return this.workoutsService.start(user.userId, dto);
  }

  @Get('active')
  getActive(@CurrentUser() user: AuthenticatedUser): Promise<WorkoutSessionResponse | null> {
    return this.workoutsService.getActive(user.userId);
  }

  @Get('recent')
  recent(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<WorkoutSessionResponse[]> {
    return this.workoutsService.recent(user.userId, Math.min(Math.max(limit, 1), 50));
  }

  @Patch(':id/pause')
  pause(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkoutSessionResponse> {
    return this.workoutsService.pause(user.userId, id);
  }

  @Patch(':id/resume')
  resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkoutSessionResponse> {
    return this.workoutsService.resume(user.userId, id);
  }

  @Patch(':id/metrics')
  updateMetrics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutMetricsDto,
  ): Promise<WorkoutSessionResponse> {
    return this.workoutsService.updateMetrics(user.userId, id, dto);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  finish(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: FinishWorkoutDto,
  ): Promise<WorkoutSessionResponse> {
    return this.workoutsService.finish(user.userId, id, dto);
  }

  @Delete(':id')
  discard(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<WorkoutSessionResponse> {
    return this.workoutsService.discard(user.userId, id);
  }
}
