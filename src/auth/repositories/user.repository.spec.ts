import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repo = module.get<UserRepository>(UserRepository);
  });

  describe('findByGoogleUid', () => {
    it('should call prisma.user.findUnique with google_uid', async () => {
      const mockUser = { id: 1, google_uid: 'uid-123', email: 'a@b.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repo.findByGoogleUid('uid-123');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { google_uid: 'uid-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      const result = await repo.findByGoogleUid('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findActiveByGoogleUid', () => {
    it('should call prisma.user.findFirst with google_uid and is_active true', async () => {
      const mockUser = { id: 1, google_uid: 'uid-123', is_active: true };
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await repo.findActiveByGoogleUid('uid-123');

      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: { google_uid: 'uid-123', is_active: true },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user is inactive or not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      const result = await repo.findActiveByGoogleUid('uid-123');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should call prisma.user.create with provided data', async () => {
      const createData = {
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        email: 'john@example.com',
        dob: new Date('1990-01-15'),
        google_uid: 'uid-123',
      };
      const mockCreated = { id: 1, ...createData };
      mockPrismaService.user.create.mockResolvedValue(mockCreated);

      const result = await repo.create(createData);

      expect(mockPrismaService.user.create).toHaveBeenCalledWith({ data: createData });
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last_login to current date for the given id', async () => {
      const mockUpdated = { id: 1, last_login: new Date() };
      mockPrismaService.user.update.mockResolvedValue(mockUpdated);

      await repo.updateLastLogin(1);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { last_login: expect.any(Date) },
      });
    });
  });

  describe('findById', () => {
    it('should call prisma.user.findUnique with id', async () => {
      const mockUser = { id: 1, email: 'a@b.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repo.findById(1);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockUser);
    });
  });
});
