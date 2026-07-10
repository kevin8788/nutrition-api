import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PlannedWorkoutRepository } from './repositories/planned-workout.repository';
import {
  WorkoutSessionRepository,
  WorkoutSessionWithPlanned,
} from './repositories/workout-session.repository';
import { WorkoutsService } from './workouts.service';

const buildSession = (
  overrides: Partial<WorkoutSessionWithPlanned> = {},
): WorkoutSessionWithPlanned => ({
  id: 1n,
  created_at: new Date('2026-07-10T08:29:00Z'),
  user_id: 42n,
  planned_workout_id: null,
  workout_type: 'walk',
  status: 'in_progress',
  is_indoor: true,
  started_at: new Date('2026-07-10T08:29:00Z'),
  ended_at: null,
  duration_seconds: 0,
  distance_km: 0,
  avg_speed_kmh: null,
  calories: 0,
  effort_rating: null,
  planned_workout: null,
  ...overrides,
});

describe('WorkoutsService', () => {
  let service: WorkoutsService;
  let sessions: jest.Mocked<WorkoutSessionRepository>;
  let plannedWorkouts: jest.Mocked<PlannedWorkoutRepository>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        WorkoutsService,
        {
          provide: WorkoutSessionRepository,
          useValue: {
            create: jest.fn(),
            findByIdForUser: jest.fn(),
            findActiveForUser: jest.fn(),
            update: jest.fn(),
            findRecentCompleted: jest.fn(),
          },
        },
        {
          provide: PlannedWorkoutRepository,
          useValue: {
            findByIdForUser: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(WorkoutsService);
    sessions = moduleRef.get(WorkoutSessionRepository);
    plannedWorkouts = moduleRef.get(PlannedWorkoutRepository);
  });

  describe('start', () => {
    it('creates a session and maps ids to strings', async () => {
      sessions.findActiveForUser.mockResolvedValue(null);
      sessions.create.mockResolvedValue(buildSession());

      const result = await service.start('42', { workout_type: 'walk', is_indoor: true });

      expect(sessions.create).toHaveBeenCalledWith({
        user_id: 42n,
        workout_type: 'walk',
        planned_workout_id: null,
        is_indoor: true,
      });
      expect(result.id).toBe('1');
      expect(result.title).toBe('Walk');
      expect(result.status).toBe('in_progress');
    });

    it('rejects when an active session already exists', async () => {
      sessions.findActiveForUser.mockResolvedValue(buildSession());

      await expect(service.start('42', { workout_type: 'walk' })).rejects.toThrow(
        ConflictException,
      );
      expect(sessions.create).not.toHaveBeenCalled();
    });

    it('rejects a planned workout that does not belong to the user', async () => {
      sessions.findActiveForUser.mockResolvedValue(null);
      plannedWorkouts.findByIdForUser.mockResolvedValue(null);

      await expect(
        service.start('42', { workout_type: 'walk', planned_workout_id: '7' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('status transitions', () => {
    it('pauses an in-progress session', async () => {
      sessions.findByIdForUser.mockResolvedValue(buildSession());
      sessions.update.mockResolvedValue(buildSession({ status: 'paused' }));

      const result = await service.pause('42', '1');

      expect(sessions.update).toHaveBeenCalledWith(1n, { status: 'paused' });
      expect(result.status).toBe('paused');
    });

    it('rejects resuming a session that is not paused', async () => {
      sessions.findByIdForUser.mockResolvedValue(buildSession({ status: 'completed' }));

      await expect(service.resume('42', '1')).rejects.toThrow(ConflictException);
    });

    it('throws not found for sessions of other users', async () => {
      sessions.findByIdForUser.mockResolvedValue(null);

      await expect(service.pause('42', '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('finish', () => {
    it('stores final metrics and marks the planned workout completed', async () => {
      sessions.findByIdForUser.mockResolvedValue(
        buildSession({ planned_workout_id: 7n }),
      );
      sessions.update.mockResolvedValue(
        buildSession({
          status: 'completed',
          duration_seconds: 60,
          distance_km: 0.1,
          calories: 4,
          effort_rating: 7,
          ended_at: new Date('2026-07-10T08:31:00Z'),
        }),
      );

      const result = await service.finish('42', '1', {
        duration_seconds: 60,
        distance_km: 0.1,
        calories: 4,
        effort_rating: 7,
      });

      expect(sessions.update).toHaveBeenCalledWith(
        1n,
        expect.objectContaining({
          status: 'completed',
          duration_seconds: 60,
          distance_km: 0.1,
          calories: 4,
          effort_rating: 7,
          ended_at: expect.any(Date),
        }),
      );
      expect(plannedWorkouts.updateStatus).toHaveBeenCalledWith(7n, 'completed');
      expect(result.effortRating).toBe(7);
    });

    it('rejects finishing an already completed session', async () => {
      sessions.findByIdForUser.mockResolvedValue(buildSession({ status: 'completed' }));

      await expect(service.finish('42', '1', {})).rejects.toThrow(ConflictException);
    });
  });
});
