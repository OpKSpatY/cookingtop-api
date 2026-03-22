import { HttpException, Logger } from '@nestjs/common';

/**
 * Verifica se o erro é um PrismaClientKnownRequestError (tem propriedade `code`).
 */
export function isPrismaKnownRequestError(
  error: unknown,
): error is { code: string; meta?: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: string }).code === 'string'
  );
}

/**
 * Registra o erro e repropaga para o filtro global (HttpException, Prisma, etc.).
 * HttpException 4xx é logado como warn; demais erros como error.
 */
export function logAndRethrow(
  logger: Logger,
  context: string,
  error: unknown,
): never {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  if (error instanceof HttpException) {
    const status = error.getStatus();
    if (status >= 500) {
      logger.error(`${context}: ${message}`, stack);
    } else {
      logger.warn(`${context}: ${message}`);
    }
    throw error;
  }

  logger.error(`${context}: ${message}`, stack);
  throw error;
}
