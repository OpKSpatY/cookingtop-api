import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'Variável DIRECT_URL ou DATABASE_URL deve estar definida no .env para o Prisma.',
      );
    }
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexão com o banco de dados estabelecida');
    } catch (error) {
      this.logger.error(
        'Falha ao conectar ao banco de dados',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('Conexão com o banco de dados encerrada');
    } catch (error) {
      this.logger.error(
        'Erro ao encerrar conexão com o banco de dados',
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}