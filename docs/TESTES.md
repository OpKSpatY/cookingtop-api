# Guia de Testes - Passo a Passo

Este documento explica como funcionam os testes no projeto e como escrevê-los.

---

## 1. Tipos de Teste

### Testes Unitários (`.spec.ts`)
- Testam **uma unidade** isolada: uma classe, um método.
- **Mockam** as dependências (banco, serviços externos).
- Rápidos, não precisam de banco ou API rodando.
- Ficam ao lado do arquivo testado: `auth.service.spec.ts` junto de `auth.service.ts`.

### Testes E2E (`.e2e-spec.ts`)
- Testam o **fluxo completo** via HTTP.
- Usam a aplicação real, com banco de dados.
- Mais lentos e exigem ambiente configurado.
- Ficam na pasta `test/`.

---

## 2. Estrutura de um Teste

```typescript
describe('NomeDoQueEstouTestando', () => {
  // Setup: roda antes de cada teste
  beforeEach(async () => {
    // Preparar mocks, criar módulo de teste
  });

  // Limpeza: roda depois de cada teste
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve fazer X quando Y acontece', async () => {
    // 1. Arrange: preparar dados e mocks
    // 2. Act: chamar o método/rota
    // 3. Assert: verificar o resultado
  });
});
```

- **describe**: agrupa testes relacionados.
- **it**: um cenário específico.
- **beforeEach/afterEach**: configuração e limpeza por teste.

---

## 3. O que é Mock?

**Mock** = objeto falso que simula o comportamento real.

Exemplo: em vez de usar o Prisma de verdade (que precisa de banco), criamos um objeto que "finge" ser o Prisma:

```typescript
const mockPrisma = {
  user: {
    findUnique: jest.fn().mockResolvedValue(null),  // sempre retorna null
    create: jest.fn().mockResolvedValue(mockUser),   // retorna usuário fake
  },
};
```

Assim testamos o `AuthService` sem depender do banco.

---

## 4. Passo a Passo: Teste de Registro

### 4.1. O que queremos testar?
Que o `AuthService.register()` cria um usuário e retorna token + dados.

### 4.2. Preparar o módulo de teste

```typescript
const module = await Test.createTestingModule({
  providers: [
    AuthService,
    { provide: PrismaService, useValue: mockPrisma },
    { provide: JwtService, useValue: mockJwt },
  ],
}).compile();

service = module.get<AuthService>(AuthService);
```

- `Test.createTestingModule`: monta um módulo NestJS só para o teste.
- `provide` + `useValue`: troca a dependência real pelo mock.

### 4.3. Configurar o mock

```typescript
(prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
(prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
```

- `findUnique` retorna `null` → email não existe, pode criar.
- `create` retorna o usuário criado.

### 4.4. Executar e verificar

```typescript
const result = await service.register({
  name: 'Usuário Teste',
  email: 'teste@email.com',
  password: 'senha123',
});

expect(result).toHaveProperty('access_token');
expect(result).toHaveProperty('user');
expect(result.user.email).toBe('teste@email.com');
expect(prisma.user.create).toHaveBeenCalled();
```

---

## 5. Passo a Passo: Teste de Login

### 5.1. O que queremos testar?
Que o `AuthService.login()` retorna token e dados do usuário.

### 5.2. Mock do Prisma

```typescript
(prisma.user.update as jest.Mock).mockResolvedValue({
  ...mockUser,
  lastLoginAt: new Date(),
});
```

O login atualiza `lastLoginAt` e gera o token.

### 5.3. Executar e verificar

```typescript
const result = await service.login(mockUser);

expect(result.access_token).toBe('fake-jwt-token');
expect(result.user).toMatchObject({
  id: mockUser.id,
  email: mockUser.email,
});
```

---

## 6. Comandos

```bash
# Todos os testes unitários
npm run test

# Modo watch (re-executa ao salvar)
npm run test:watch

# Com cobertura
npm run test:cov

# Apenas um arquivo
npm run test -- auth.service.spec
```

---

## 7. Boas Práticas

1. **Um conceito por teste**: cada `it` deve verificar uma coisa.
2. **Nomes descritivos**: "deve retornar 401 quando senha está incorreta".
3. **Independentes**: testes não devem depender da ordem de execução.
4. **Mocks mínimos**: mocke só o necessário.
5. **Arrange-Act-Assert**: organize o teste em 3 blocos claros.

---

## 8. Arquivos de Teste no Projeto

| Arquivo | O que testa |
|---------|-------------|
| `auth.service.spec.ts` | AuthService: register, validateUser, login |
| `auth.controller.spec.ts` | AuthController: delegação para AuthService |
