import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { AUTH_COOKIE_NAME } from './auth/auth.constants';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  configureApp(app);

  // Documentation OpenAPI : jamais exposée en production.
  if (!env.isProduction) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('API SGEE')
        .setDescription(
          'Portail boursiers, candidatures et back-office. Les requêtes modifiantes exigent l’en-tête X-SGEE-CSRF: 1.',
        )
        .setVersion('1.0')
        .addCookieAuth(AUTH_COOKIE_NAME)
        .build(),
    );

    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(env.PORT);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
