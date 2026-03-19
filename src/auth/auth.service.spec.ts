import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

describe('AuthService - Serviço de autenticação', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-123',
    email: 'teste@email.com',
    name: 'Usuário Teste',
    xp: 0,
    avatarId: 1,
    profileDescription: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };

  const mockUserAuth = {
    id: 'auth-123',
    provider: 'LOCAL',
    providerId: null,
    password: '$2b$10$hashedpassword',
    createdAt: new Date(),
    userId: 'user-123',
  };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockJwt = {
      sign: jest.fn().mockReturnValue('fake-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);

  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register() - Registro de novo usuário', () => {
    it('deve criar usuário e retornar token + dados do usuário', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });

      const result = await service.register({
        name: 'Usuário Teste',
        email: 'teste@email.com',
        password: 'senha123',
      });

      expect(result).toHaveProperty('access_token', 'fake-jwt-token');
      expect(result).toHaveProperty('user');
      expect(result.user).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        xp: 0,
        avatarId: 1,
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Usuário Teste',
            email: 'teste@email.com',
            xp: 0,
            avatarId: 1,
          }),
        }),
      );
    });

    it('deve lançar ConflictException quando email já existe', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.register({
          name: 'Outro',
          email: 'teste@email.com',
          password: 'senha123',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser() - Validação de credenciais', () => {
    it('deve retornar usuário quando credenciais são válidas', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        userAuth: [mockUserAuth],
      });

      const result = await service.validateUser('teste@email.com', 'senha123');

      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
      });
      expect(result).not.toHaveProperty('userAuth');
    });

    it('deve retornar null quando usuário não existe', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('naoexiste@email.com', 'senha');

      expect(result).toBeNull();
    });

    it('deve retornar null quando senha está incorreta', async () => {
      const bcrypt = require('bcrypt');
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        userAuth: [mockUserAuth],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('teste@email.com', 'senhaerrada');

      expect(result).toBeNull();
    });
  });

  describe('login() - Login e geração de token', () => {
    it('deve retornar access_token e dados do usuário', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });

      const result = await service.login(mockUser);

      expect(result.access_token).toBe('fake-jwt-token');
      expect(result.user).toMatchObject({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });
  });
});
