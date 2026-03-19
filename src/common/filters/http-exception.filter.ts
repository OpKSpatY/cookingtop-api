import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface PrismaKnownRequestError {
  code: string;
  meta?: { target?: string[] };
}

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, error } = this.normalizeException(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `[${statusCode}] ${Array.isArray(message) ? message.join(', ') : message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${statusCode}] ${Array.isArray(message) ? message.join(', ') : message}`,
      );
    }

    response.status(statusCode).json({
      statusCode,
      message,
      ...(error && { error }),
    } satisfies ErrorResponse);
  }

  private normalizeException(exception: unknown): ErrorResponse {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        return {
          statusCode: status,
          message: (res.message as string | string[]) ?? exception.message,
          error: res.error as string | undefined,
        };
      }

      return {
        statusCode: status,
        message: exception.message,
      };
    }

    if (this.isPrismaError(exception)) {
      return this.handlePrismaError(exception);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
      error: 'Internal Server Error',
    };
  }

  private isPrismaError(error: unknown): error is PrismaKnownRequestError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as PrismaKnownRequestError).code === 'string'
    );
  }

  private handlePrismaError(error: PrismaKnownRequestError): ErrorResponse {
    switch (error.code) {
      case 'P2002': {
        const target = (error.meta?.target as string[])?.[0] ?? 'campo';
        return {
          statusCode: HttpStatus.CONFLICT,
          message: `Já existe um registro com este ${target}`,
          error: 'Conflict',
        };
      }
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Registro não encontrado',
          error: 'Not Found',
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro ao processar a requisição no banco de dados',
          error: 'Internal Server Error',
        };
    }
  }
}
