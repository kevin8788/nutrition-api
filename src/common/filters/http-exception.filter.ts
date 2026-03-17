import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const payload = exceptionResponse as Record<string, unknown>;
        message =
          (payload.message as string | string[] | undefined) ?? exception.message;
        error = (payload.error as string | undefined) ?? error;
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name.replace(/Exception$/, '') || error;
      }
    } else if (exception instanceof Error) {
      message = exception.message || message;
    }

    if (error === 'Internal Server Error' && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      error = HttpStatus[status] ?? error;
    }

    const logMessage = Array.isArray(message) ? message.join(', ') : message;
    this.logger.error(logMessage, exception instanceof Error ? exception.stack : undefined);

    response.status(status).json({
      statusCode: status,
      message,
      error,
    });
  }
}
