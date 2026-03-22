import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../../generated/prisma/client';
import type { UpdateUserDto } from './users.user.dto';
import {
  isPrismaKnownRequestError,
  logAndRethrow,
} from '../common/utils/service-error.util';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
        include: { userAuth: true },
      });
    } catch (error) {
      logAndRethrow(
        this.logger,
        `Erro ao buscar usuário por email (${email})`,
        error,
      );
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logAndRethrow(this.logger, `Erro ao buscar usuário por id (${id})`, error);
    }
  }

  async updateProfile(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<Omit<User, 'userAuth'>> {
    const data: { avatarId?: number; profileDescription?: string | null } = {};
    if (dto.avatarId !== undefined) data.avatarId = dto.avatarId;
    if (dto.profileDescription !== undefined)
      data.profileDescription = dto.profileDescription;

    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch (error) {
      if (isPrismaKnownRequestError(error) && error.code === 'P2025') {
        this.logger.warn(
          `Usuário não encontrado ao atualizar perfil (userId: ${userId})`,
        );
        throw new NotFoundException('Usuário não encontrado');
      }

      logAndRethrow(
        this.logger,
        `Erro ao atualizar perfil (userId: ${userId})`,
        error,
      );
    }
  }
}
