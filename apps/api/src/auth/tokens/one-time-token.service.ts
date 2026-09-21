import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  OneTimeTokenPurpose,
  Prisma,
  SessionSubject,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export const TOKEN_TTL_MS: Record<OneTimeTokenPurpose, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

export type TokenSubject = { type: SessionSubject; id: string };

type TokenWriter = Pick<Prisma.TransactionClient, 'oneTimeToken'>;

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

/**
 * Jetons à usage unique envoyés par e-mail : 256 bits aléatoires, seule l'empreinte
 * est stockée, durée de vie courte, consommation atomique, un seul jeton valide
 * par sujet et par usage.
 */
@Injectable()
export class OneTimeTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(
    purpose: OneTimeTokenPurpose,
    subject: TokenSubject,
    client: TokenWriter = this.prisma,
  ) {
    const now = new Date();
    const token = randomBytes(32).toString('base64url');

    await client.oneTimeToken.updateMany({
      where: {
        purpose,
        subjectType: subject.type,
        subjectId: subject.id,
        usedAt: null,
      },
      data: { usedAt: now },
    });
    await client.oneTimeToken.create({
      data: {
        purpose,
        subjectType: subject.type,
        subjectId: subject.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[purpose]),
      },
    });

    return token;
  }

  /** Lit le sujet d'un jeton encore valide sans le consommer (validation préalable). */
  async peek(
    purpose: OneTimeTokenPurpose,
    token: string,
  ): Promise<TokenSubject> {
    const record = await this.prisma.oneTimeToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        purpose,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException('Lien invalide ou expiré');
    }

    return { type: record.subjectType, id: record.subjectId };
  }

  /** Consomme le jeton ou lève une erreur générique (inconnu, expiré ou déjà utilisé). */
  async consume(
    purpose: OneTimeTokenPurpose,
    token: string,
    client: Pick<Prisma.TransactionClient, 'oneTimeToken'> = this.prisma,
  ): Promise<TokenSubject> {
    const now = new Date();
    const tokenHash = hashToken(token);
    const { count } = await client.oneTimeToken.updateMany({
      where: { tokenHash, purpose, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });

    if (count !== 1) {
      throw new BadRequestException('Lien invalide ou expiré');
    }

    const record = await client.oneTimeToken.findUniqueOrThrow({
      where: { tokenHash },
    });

    return { type: record.subjectType, id: record.subjectId };
  }
}
