import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';
import { env } from '../../config/env';

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Logs JSON structurés (pino) : un identifiant par requête, repris de `X-Request-Id`
 * s'il est fourni par le reverse proxy et renvoyé au client pour le support.
 * Les cookies de session, en-têtes d'authentification et mots de passe ne sont jamais écrits.
 */
export const loggerConfig: Params = {
  pinoHttp: {
    level: env.LOG_LEVEL,
    genReqId: (request: IncomingMessage, response: ServerResponse) => {
      const incoming = request.headers[REQUEST_ID_HEADER];
      const id =
        typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming)
          ? incoming
          : randomUUID();

      response.setHeader('X-Request-Id', id);

      return id;
    },
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'res.headers["set-cookie"]',
        '*.password',
        '*.iban',
      ],
      censor: '[masqué]',
    },
    autoLogging: {
      ignore: (request) => request.url?.startsWith('/api/health') ?? false,
    },
    customLogLevel: (_request, response, error) => {
      if (error || response.statusCode >= 500) {
        return 'error';
      }

      return response.statusCode >= 400 ? 'warn' : 'info';
    },
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { singleLine: true } }
        : undefined,
  },
};
