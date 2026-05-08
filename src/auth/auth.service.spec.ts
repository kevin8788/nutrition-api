import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserRepository } from './repositories/user.repository';
import { DecodedFirebaseUser } from './interfaces/firebase-user.interface';
import { GoogleSignupDto } from './dto/google-signup.dto';

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
};

const mockUserRepository = {
  findByGoogleUid: jest.fn(),
  findActiveByGoogleUid: jest.fn(),
  create: jest.fn(),
  updateLastLogin: jest.fn(),
  findById: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UserRepository, useValue: mockUserRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('googleSignup', () => {
    const firebaseUser: DecodedFirebaseUser = {
      google_uid: 'uid-123',
      email: 'john@example.com',
    };

    const dto: GoogleSignupDto = {
      first_name: 'John',
      last_name: 'Doe',
      username: 'johndoe',
      dob: '1990-01-15',
    };

    it('should throw ConflictException if user already exists', async () => {
      mockUserRepository.findByGoogleUid.mockResolvedValue({ id: 1 });

      await expect(service.googleSignup(firebaseUser, dto)).rejects.toThrow(ConflictException);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should create user and return token if user does not exist', async () => {
      mockUserRepository.findByGoogleUid.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue({ id: 1, email: 'john@example.com' });

      const result = await service.googleSignup(firebaseUser, dto);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        dob: new Date('1990-01-15'),
        google_uid: 'uid-123',
        gender: undefined,
      });
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: { id: '1', email: 'john@example.com' },
      });
    });
  });

  describe('googleLogin', () => {
    const firebaseUser: DecodedFirebaseUser = {
      google_uid: 'uid-123',
      email: 'john@example.com',
    };

    it('should throw UnauthorizedException if user not found or inactive', async () => {
      mockUserRepository.findActiveByGoogleUid.mockResolvedValue(null);

      await expect(service.googleLogin(firebaseUser)).rejects.toThrow(UnauthorizedException);
    });

    it('should update last_login and return token for active user', async () => {
      const mockUser = { id: 2, email: 'john@example.com', is_active: true };
      mockUserRepository.findActiveByGoogleUid.mockResolvedValue(mockUser);

      const result = await service.googleLogin(firebaseUser);

      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(2);
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: { id: '2', email: 'john@example.com' },
      });
    });
  });

  describe('getProfile', () => {
    const mockDbUser = {
      id: BigInt(42),
      email: 'john@example.com',
      first_name: 'John',
      last_name: 'Doe',
      username: 'johndoe',
      gender: 'M',
      dob: new Date('1990-05-20'),
      created_at: new Date('2026-01-01T10:00:00.000Z'),
      is_active: true,
      google_uid: 'uid-abc',
      last_login: new Date('2026-04-01'),
    };

    it('should return UserProfileResponse for a valid DB user', async () => {
      mockUserRepository.findById.mockResolvedValue(mockDbUser);

      const result = await service.getProfile('42');

      expect(result).toEqual({
        id: '42',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        gender: 'M',
        dob: new Date('1990-05-20').toISOString(),
        createdAt: new Date('2026-01-01T10:00:00.000Z').toISOString(),
      });
    });

    it('should not include google_uid, is_active or last_login in the response', async () => {
      mockUserRepository.findById.mockResolvedValue(mockDbUser);

      const result = await service.getProfile('42');

      expect(result).not.toHaveProperty('google_uid');
      expect(result).not.toHaveProperty('is_active');
      expect(result).not.toHaveProperty('last_login');
    });

    it('should return id as string not bigint', async () => {
      mockUserRepository.findById.mockResolvedValue(mockDbUser);

      const result = await service.getProfile('42');

      expect(typeof result.id).toBe('string');
      expect(result.id).toBe('42');
    });

    it('should throw NotFoundException if user is not found in DB', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('99')).rejects.toThrow(NotFoundException);
      await expect(service.getProfile('99')).rejects.toThrow('User not found');
    });

    it('should throw NotFoundException for UUID userId without calling findById', async () => {
      const uuidUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

      await expect(service.getProfile(uuidUserId)).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.findById).not.toHaveBeenCalled();
    });

    it('should handle nullable fields correctly', async () => {
      const userWithNulls = {
        ...mockDbUser,
        first_name: null,
        last_name: null,
        username: null,
        gender: null,
        dob: null,
      };
      mockUserRepository.findById.mockResolvedValue(userWithNulls);

      const result = await service.getProfile('42');

      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
      expect(result.username).toBeNull();
      expect(result.gender).toBeNull();
      expect(result.dob).toBeNull();
    });
  });

  describe('validateUser', () => {
    it('should return user from in-memory store', async () => {
      const registerResult = await service.register({ email: 'mem@test.com', password: 'pass123' });
      const userId = registerResult.user.id;

      const result = await service.validateUser(userId);
      expect(result).not.toBeNull();
      expect(result?.email).toBe('mem@test.com');
    });

    it('should return prisma user if not in memory', async () => {
      mockUserRepository.findById.mockResolvedValue({ id: 5, email: 'db@test.com' });

      const result = await service.validateUser('5');
      expect(result).toEqual({ id: '5', email: 'db@test.com' });
    });

    it('should return null if not found anywhere', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await service.validateUser('999');
      expect(result).toBeNull();
    });
  });
});
