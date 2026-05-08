import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { CurrentUser } from './current-user.decorator';

function getParamDecoratorFactory(decorator: Function) {
  class TestController {
    handler(@decorator() _user: unknown) {}
  }
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'handler');
  return args[Object.keys(args)[0]].factory;
}

function mockExecutionContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('@CurrentUser() decorator', () => {
  it('should return req.user when it contains a valid user payload', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const user = { userId: '42', email: 'test@example.com' };
    const ctx = mockExecutionContext(user);

    const result = factory(undefined, ctx);

    expect(result).toEqual({ userId: '42', email: 'test@example.com' });
  });

  it('should return undefined when req.user is not set', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const ctx = mockExecutionContext(undefined);

    const result = factory(undefined, ctx);

    expect(result).toBeUndefined();
  });

  it('should return the exact req.user object without transformation', () => {
    const factory = getParamDecoratorFactory(CurrentUser);
    const user = { userId: '99', email: 'other@example.com' };
    const ctx = mockExecutionContext(user);

    const result = factory(undefined, ctx);

    expect(result).toBe(user);
  });
});
