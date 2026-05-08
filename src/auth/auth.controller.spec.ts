import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserProfileResponse } from './interfaces/user-profile-response.interface';

const mockAuthService = {
  getProfile: jest.fn(),
};

const mockCurrentUser = { userId: '5', email: 'test@test.com' };

describe('AuthController - GET /auth/me', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should call authService.getProfile with the current user id', async () => {
    const profile: UserProfileResponse = {
      id: '5',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      gender: null,
      dob: null,
      createdAt: new Date('2026-01-01').toISOString(),
    };
    mockAuthService.getProfile.mockResolvedValue(profile);

    await controller.me(mockCurrentUser);

    expect(mockAuthService.getProfile).toHaveBeenCalledWith('5');
  });

  it('should return the UserProfileResponse from authService unchanged', async () => {
    const profile: UserProfileResponse = {
      id: '5',
      email: 'test@test.com',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      gender: 'F',
      dob: new Date('1995-03-10').toISOString(),
      createdAt: new Date('2026-01-01').toISOString(),
    };
    mockAuthService.getProfile.mockResolvedValue(profile);

    const result = await controller.me(mockCurrentUser);

    expect(result).toEqual(profile);
  });

  it('should propagate NotFoundException when authService.getProfile throws', async () => {
    mockAuthService.getProfile.mockRejectedValue(new NotFoundException('User not found'));

    await expect(controller.me(mockCurrentUser)).rejects.toThrow(NotFoundException);
    await expect(controller.me(mockCurrentUser)).rejects.toThrow('User not found');
  });
});
