import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { CSRF_HEADER } from './common/security/csrf.guard';
import { env } from './config/env';

/**
 * Configuration HTTP commune au démarrage (`main.ts`) et aux tests e2e,
 * pour que les tests exercent exactement la même pile de sécurité.
 */
export function configureApp(app: NestExpressApplication) {
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');
  app.use(
    helmet({
      // Le front est servi depuis une autre origine du même site (ex. :5173 → :3000).
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.enableCors({
    origin: env.FRONTEND_ORIGINS,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Accept', 'Content-Type', CSRF_HEADER],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 600,
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  return app;
}
