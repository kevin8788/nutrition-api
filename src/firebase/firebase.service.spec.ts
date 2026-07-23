import { Test, TestingModule } from '@nestjs/testing';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FirebaseService } from './firebase.service';

jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(),
  initializeApp: jest.fn(),
  cert: jest.fn().mockReturnValue({}),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

describe('FirebaseService', () => {
  let service: FirebaseService;

  beforeEach(async () => {
    (getApps as jest.Mock).mockReturnValue([]);
    const module: TestingModule = await Test.createTestingModule({
      providers: [FirebaseService],
    }).compile();

    service = module.get<FirebaseService>(FirebaseService);
    jest.clearAllMocks();
    (getApps as jest.Mock).mockReturnValue([]);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should initialize firebase-admin on module init', () => {
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it('should not re-initialize if already initialized', async () => {
    (getApps as jest.Mock).mockReturnValue([{}]);
    jest.clearAllMocks();
    await service.onModuleInit();
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('should verify a token and return google_uid and email', async () => {
    const mockVerify = jest.fn().mockResolvedValue({
      uid: 'google-uid-123',
      email: 'user@example.com',
    });
    (getAuth as jest.Mock).mockReturnValue({ verifyIdToken: mockVerify });

    const result = await service.verifyToken('valid-token');

    expect(mockVerify).toHaveBeenCalledWith('valid-token');
    expect(result).toEqual({ google_uid: 'google-uid-123', email: 'user@example.com' });
  });

  it('should throw if token is invalid', async () => {
    const mockVerify = jest.fn().mockRejectedValue(new Error('Token expired'));
    (getAuth as jest.Mock).mockReturnValue({ verifyIdToken: mockVerify });

    await expect(service.verifyToken('bad-token')).rejects.toThrow('Token expired');
  });
});
