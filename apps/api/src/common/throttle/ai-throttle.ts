import { Throttle } from '@nestjs/throttler';

/**
 * Stricter per-IP limit for endpoints that call the AI provider (each request costs money and several seconds of model
 * time), on top of the global limit. Override with AI_THROTTLE_LIMIT.
 */
export const AI_THROTTLE = { default: { limit: Number(process.env.AI_THROTTLE_LIMIT ?? 10), ttl: 60_000 } };

export const AiThrottle = () => Throttle(AI_THROTTLE);
