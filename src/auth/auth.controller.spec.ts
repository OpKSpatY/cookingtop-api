import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController - Rotas de autenticação', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockLoginResponse = {
    access_token: 'fake-jwt-token',
    user: {
      id: 'user-123',
      name: 'Teste',
      email: 'teste@email.com',
      xp: 0,
      avatarId: 1,
      profileDescription: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    },
  };

  beforeEach(async () => {
    const mockAuthService = {
      register: jest.fn().mockResolvedValue(mockLoginResponse),
      login: jest.fn().mockResolvedValue(mockLoginResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('deve chamar AuthService.register com o DTO e retornar token + usuário', async () => {
      const dto = {
        name: 'Usuário Novo',
        email: 'novo@email.com',
        password: 'senha123',
      };

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockLoginResponse);
    });
  });

  describe('POST /auth/login', () => {
    it('deve chamar AuthService.login com o usuário autenticado do request', async () => {
      const req = { user: mockLoginResponse.user };

      const result = await controller.login({} as never, req);

      expect(authService.login).toHaveBeenCalledWith(req.user);
      expect(result).toEqual(mockLoginResponse);
    });
  });
});
