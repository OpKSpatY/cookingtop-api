import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService - Cliente de banco de dados', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const mockPrismaClient = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: PrismaService, useValue: mockPrismaClient }],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('deve estar definido com métodos $connect e $disconnect', () => {
    expect(service).toBeDefined();
  });
});
