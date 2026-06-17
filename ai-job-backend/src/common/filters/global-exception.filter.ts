import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithId } from '../middleware/request-id.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithId>();
    const response = ctx.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = request.requestId ?? 'unknown';
    const message = this.toMessage(exception, statusCode);

    this.logger.error(
      JSON.stringify({
        requestId,
        method: request.method,
        path: request.url,
        statusCode,
        message,
      }),
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(statusCode).json({
      statusCode,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }

  private toMessage(exception: unknown, statusCode: number) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (
        response &&
        typeof response === 'object' &&
        'message' in response
      ) {
        const message = (response as { message?: string | string[] }).message;
        return Array.isArray(message) ? message.join('; ') : message;
      }
    }

    if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
      return '服务器暂时开小差了，请稍后重试';
    }

    return exception instanceof Error ? exception.message : 'Internal server error';
  }
}
