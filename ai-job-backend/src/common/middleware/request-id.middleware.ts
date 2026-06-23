import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export type RequestWithId = Request & {
  requestId?: string;
};

export function requestIdMiddleware(
  request: RequestWithId,
  response: Response,
  next: NextFunction,
) {
  const incoming = request.header('x-request-id');
  const requestId = incoming?.trim() || randomUUID();
  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}
