import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { PlannedWorkoutRepository } from './repositories/planned-workout.repository';
import { WeeklyGoalRepository } from './repositories/weekly-goal.repository';
import { WorkoutSessionRepository } from './repositories/workout-session.repository';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';

@Module({
  imports: [AuthModule],
  controllers: [WorkoutsController, PlanController, ProgressController],
  providers: [
    WorkoutsService,
    PlanService,
    ProgressService,
    WorkoutSessionRepository,
    PlannedWorkoutRepository,
    WeeklyGoalRepository,
  ],
})
export class WorkoutsModule {}
