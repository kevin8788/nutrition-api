import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import configuration from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Base64 image payloads are significantly larger than their binary source.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = configuration();
  await app.listen(config.port);
}

void bootstrap();
