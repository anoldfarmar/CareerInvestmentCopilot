import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { validateEnv } from './common/config/validate-env';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { SpeechRealtimeGateway } from './speech/speech-realtime.gateway';

function buildCorsOrigin() {
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  };
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule);
  app.use(requestIdMiddleware);
  app.use('/favicon.ico', (_req, res) => res.status(204).end());
  app.use('/storage', express.static(join(process.cwd(), 'storage')));
  app.use('/audio', express.static(process.env.AUDIO_UPLOAD_DIR ?? '/home/public/audio'));
  app.use(
    '/public/resume',
    express.static(
      process.env.RESUME_UPLOAD_DIR ??
        '/home/CareerInvestmentCopilot-main/ai-job-backend/public/resume',
    ),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.enableCors({
    origin: buildCorsOrigin(),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI 求职助手 API')
    .setDescription('AI 求职助手后端接口文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocumentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api-docs', app, swaggerDocumentFactory);

  app.get(SpeechRealtimeGateway).bind(app.getHttpServer());

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
