import { FastifyReply } from 'fastify';
import { ApiResponse } from '@muza/shared';

export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200, meta?: Record<string, any>) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    meta,
  };
  return reply.code(statusCode).send(payload);
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details: any = null
) {
  const payload: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  return reply.code(statusCode).send(payload);
}
