import { Test, TestingModule } from '@nestjs/testing';
import * as admin from 'firebase-admin';
import { FirebaseService } from './firebase.service';

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn().mockReturnValue({}),
  },
  auth: jest.fn(),
}));

describe('FirebaseService', () => {
  let service: FirebaseService;

  beforeEach(async () => {
    (admin.apps as any) = [];
    const module: TestingModule = await Test.createTestingModule({
      providers: [FirebaseService],
    }).compile();

    service = module.get<FirebaseService>(FirebaseService);
    jest.clearAllMocks();
    (admin.apps as any) = [];
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize firebase-admin on module init', () => {
    expect(admin.initializeApp).toHaveBeenCalledTimes(1);
  });

  it('should not re-initialize if already initialized', async () => {
    (admin.apps as any) = [{}];
    jest.clearAllMocks();
    await service.onModuleInit();
    expect(admin.initializeApp).not.toHaveBeenCalled();
  });

  it('should verify a token and return google_uid and email', async () => {
    const mockVerify = jest.fn().mockResolvedValue({
      uid: 'google-uid-123',
      email: 'user@example.com',
    });
    (admin.auth as jest.Mock).mockReturnValue({ verifyIdToken: mockVerify });

    const result = await service.verifyToken('valid-token');

    expect(mockVerify).toHaveBeenCalledWith('valid-token');
    expect(result).toEqual({ google_uid: 'google-uid-123', email: 'user@example.com' });
  });

  it('should throw if token is invalid', async () => {
    const mockVerify = jest.fn().mockRejectedValue(new Error('Token expired'));
    (admin.auth as jest.Mock).mockReturnValue({ verifyIdToken: mockVerify });

    await expect(service.verifyToken('bad-token')).rejects.toThrow('Token expired');
  });
});
