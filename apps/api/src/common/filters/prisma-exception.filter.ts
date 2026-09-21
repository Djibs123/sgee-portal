import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

const KNOWN_ERRORS: Record<string, { status: HttpStatus; message: string }> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'Cette ressource existe déjà',
  },
  P2003: {
    status: HttpStatus.CONFLICT,
    message: 'Référence à une ressource inexistante',
  },
  P2025: { status: HttpStatus.NOT_FOUND, message: 'Ressource introuvable' },
};

/**
 * Traduit les erreurs Prisma connues en réponses HTTP claires, sans exposer de
 * détail technique (noms de tables, contraintes). Les autres remontent en 500.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const known = KNOWN_ERRORS[exception.code];

    if (!known || host.getType() !== 'http') {
      super.catch(exception, host);
      return;
    }

    host
      .switchToHttp()
      .getResponse<Response>()
      .status(known.status)
      .json({ statusCode: known.status, message: known.message });
  }
}
