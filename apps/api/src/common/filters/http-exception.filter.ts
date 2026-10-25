import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        error = resp.error || exception.name;
      }
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        message = 'Too many requests. Please wait a moment and try again.';
        error = 'TOO_MANY_REQUESTS';
      }
    } else if (
      exception &&
      typeof exception === 'object' &&
      [(exception as any).status, (exception as any).statusCode].some((s) => Number.isInteger(s) && s >= 400 && s < 500)
    ) {
      // Errors from Express middleware (e.g. body-parser: 413 payload too large, 400 bad JSON)
      status = (exception as any).status ?? (exception as any).statusCode;
      message = status === 413 ? 'Request body is too large' : status === 400 ? 'Malformed request' : 'Request error';
      error = status === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma-specific errors
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with this data already exists';
          error = 'DUPLICATE_ENTRY';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          error = 'NOT_FOUND';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid reference';
          error = 'INVALID_REFERENCE';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = 'Database error';
          error = 'DATABASE_ERROR';
      }
    } else if (exception instanceof Error) {
      // Security: Do not leak raw internal error messages to client in production
      if (process.env.NODE_ENV === 'development') {
        message = exception.message;
        error = exception.name;
      } else {
        // Keep the defaults: 500 Internal server error
        // But we store the actual message for the internal logger below
        const internalMessage = exception.message;
        this.logger.error(
          `${request.method} ${request.url} → ${status}: ${internalMessage}`,
          exception.stack,
        );
        // Return early since we already logged it with the real message
        response.status(status).json({
          success: false,
          statusCode: status,
          error,
          message: [message],
          timestamp: new Date().toISOString(),
          path: request.url,
        });
        return;
      }
    }

    // Only server faults are errors. A 401 is routine (a visitor with no session), other 4xx are warnings.
    const line = `${request.method} ${request.url} → ${status}: ${message}`;
    if (status >= 500) {
      this.logger.error(line, exception instanceof Error ? exception.stack : undefined);
    } else if (status === HttpStatus.UNAUTHORIZED) {
      this.logger.debug(line);
    } else {
      this.logger.warn(line);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message: Array.isArray(message) ? message : [message],
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
