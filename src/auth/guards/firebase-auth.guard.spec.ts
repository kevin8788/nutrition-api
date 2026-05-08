import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { FirebaseService } from '../../firebase/firebase.service';

const mockFirebaseService = {
  verifyToken: jest.fn(),
};

const mockRequest = (authHeader?: string) => ({
  headers: { authorization: authHeader },
  user: undefined,
});

const mockContext = (request: any): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext);

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new FirebaseAuthGuard(mockFirebaseService as any);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException if no authorization header', async () => {
    const context = mockContext(mockRequest(undefined));
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if header does not start with Bearer', async () => {
    const context = mockContext(mockRequest('Basic sometoken'));
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if firebase token is invalid', async () => {
    mockFirebaseService.verifyToken.mockRejectedValue(new Error('Invalid token'));
    const context = mockContext(mockRequest('Bearer bad-token'));
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should set req.user and return true for a valid token', async () => {
    const decoded = { google_uid: 'uid-123', email: 'user@example.com' };
    mockFirebaseService.verifyToken.mockResolvedValue(decoded);

    const request = mockRequest('Bearer valid-token');
    const context = mockContext(request);

    const result = await guard.canActivate(context);

    expect(mockFirebaseService.verifyToken).toHaveBeenCalledWith('valid-token');
    expect(result).toBe(true);
    expect(request.user).toEqual(decoded);
  });
});
