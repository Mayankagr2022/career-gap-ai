import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  statusCode: number;
  data: T;
  message?: string;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        // If the response already has a success flag, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        return {
          success: true,
          statusCode: response.statusCode,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
