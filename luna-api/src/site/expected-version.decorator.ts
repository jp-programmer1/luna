import { createParamDecorator, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Lee la versión del borrador que tenía el panel, del header If-Match ("12" o 12).
 * Sin él la API no sabe si el panel está viendo lo último: 428.
 */
export const ExpectedVersion = createParamDecorator((_: unknown, ctx: ExecutionContext): number => {
  const raw = ctx.switchToHttp().getRequest<Request>().headers['if-match'];
  const value = Number(String(raw ?? '').replace(/^W\//, '').replace(/"/g, '').trim());
  if (raw === undefined || !Number.isInteger(value) || value < 0) {
    throw new HttpException(
      { statusCode: 428, message: 'Falta el header If-Match con la versión del borrador.' },
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
  return value;
});
