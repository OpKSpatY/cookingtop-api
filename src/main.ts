import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  if (configService.get<string>('NODE_ENV') === 'development') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Cookingtop API')
      .setDescription('Documentação da API do Cookingtop')
      .setVersion('1.0')
      .addTag('cookingtop')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
  }

  const port = process.env.PORT ?? 3000;
  try {
    await app.listen(port, '0.0.0.0');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
bootstrap();
