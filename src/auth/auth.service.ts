import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../../generated/prisma/client';
import type { CreateUserDto } from '../users/users.user.dto';

export interface LoginUserResponse {
  id: string;
  name: string;
  email: string;
  xp: number;
  avatarId: number;
  profileDescription: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { userAuth: true },
    });

    if (!user) return null;

    const localAuth = user.userAuth.find((a) => a.provider === 'LOCAL');
    if (!localAuth?.password) return null;

    const isPasswordValid = await bcrypt.compare(password, localAuth.password);
    if (!isPasswordValid) return null;

    const { userAuth, ...userWithoutAuth } = user;
    return userWithoutAuth;
  }

  async register(
    dto: CreateUserDto,
  ): Promise<{ access_token: string; user: LoginUserResponse }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        xp: 0,
        avatarId: 1,
        userAuth: {
          create: {
            provider: 'LOCAL',
            password: hashedPassword,
          },
        },
      },
    });

    return this.login(user);
  }

  async login(
    user: {
      id: string;
      email: string;
      name: string;
      xp: number;
      avatarId: number;
      profileDescription: string | null;
      createdAt: Date;
      lastLoginAt: Date | null;
    },
  ): Promise<{ access_token: string; user: LoginUserResponse }> {
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    const userResponse: LoginUserResponse = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      xp: updated.xp,
      avatarId: updated.avatarId,
      profileDescription: updated.profileDescription,
      createdAt: updated.createdAt,
      lastLoginAt: updated.lastLoginAt,
    };

    return { access_token, user: userResponse };
  }
}
