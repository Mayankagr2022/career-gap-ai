import { HttpException } from '@nestjs/common';

/**
 * Message stored on a failed resume/analysis and shown to the user. The real error is surfaced
 * (AI provider errors included) rather than replaced by a generic message or fallback data.
 */
export function publicErrorMessage(error: unknown): string {
  let msg: unknown;
  if (error instanceof HttpException) {
    const res = error.getResponse() as any;
    msg = typeof res === 'string' ? res : res?.message ?? error.message;
  } else if (error instanceof Error) {
    msg = error.cause instanceof Error ? `${error.message}: ${error.cause.message}` : error.message;
  } else {
    msg = error;
  }
  const text = String(Array.isArray(msg) ? msg.join('; ') : msg || 'Unknown error');
  return text.slice(0, 500);
}
