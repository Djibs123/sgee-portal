import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { AuditService } from '../../audit/audit.service';
import { MailerService } from '../../mail/mailer.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionService, type ClientMeta } from '../session/session.service';
import { OneTimeTokenService } from '../tokens/one-time-token.service';
import { assertAcceptablePassword } from './password.policy';

export type ResettableAccount = 'STUDENT' | 'APPLICANT';

export const RESET_REQUESTED = {
  message:
    'Si un compte correspond à cette adresse, un lien de réinitialisation vient d’être envoyé.',
};

/** Mot de passe oublié pour les boursiers et les candidats (les admins passent par un super-admin). */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: OneTimeTokenService,
    private readonly sessions: SessionService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
  ) {}

  async requestReset(
    email: string,
    accountType: ResettableAccount,
    meta: ClientMeta,
  ) {
    const account =
      accountType === 'STUDENT'
        ? await this.prisma.student.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            select: { id: true, email: true, firstName: true },
          })
        : await this.prisma.applicant.findUnique({
            where: { email },
            select: { id: true, email: true, firstName: true },
          });

    if (!account) {
      return RESET_REQUESTED;
    }

    const token = await this.tokens.issue('PASSWORD_RESET', {
      type: accountType,
      id: account.id,
    });
    const link = this.mailer.link('/reinitialiser', { token });

    await this.audit.record({
      actor: { type: accountType, id: account.id, ip: meta.ip },
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: accountType === 'STUDENT' ? 'Student' : 'Applicant',
      entityId: account.id,
    });
    void this.mailer
      .send({
        to: account.email,
        subject: 'Réinitialisation de votre mot de passe – Portail SGEE',
        text: [
          `Bonjour ${account.firstName},`,
          '',
          'Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :',
          link,
          '',
          'Si vous n’avez rien demandé, ignorez ce message : votre mot de passe reste inchangé.',
          '',
          'Service de Gestion des Étudiants sénégalais à l’Étranger',
        ].join('\n'),
      })
      .catch((error: unknown) =>
        this.logger.error(
          `Envoi du lien de réinitialisation impossible : ${String(error)}`,
        ),
      );

    return RESET_REQUESTED;
  }

  async reset(token: string, password: string, meta: ClientMeta) {
    const subject = await this.tokens.peek('PASSWORD_RESET', token);

    if (subject.type !== 'STUDENT' && subject.type !== 'APPLICANT') {
      throw new BadRequestException('Lien invalide ou expiré');
    }

    const email =
      subject.type === 'STUDENT'
        ? (
            await this.prisma.student.findUniqueOrThrow({
              where: { id: subject.id },
            })
          ).email
        : (
            await this.prisma.applicant.findUniqueOrThrow({
              where: { id: subject.id },
            })
          ).email;

    // Vérifié avant de consommer le jeton : un refus ne « brûle » pas le lien.
    assertAcceptablePassword(password, email);

    const passwordHash = await bcrypt.hash(password, 12);
    const reset = { passwordHash, failedLoginAttempts: 0, lockedUntil: null };

    await this.prisma.$transaction(async (tx) => {
      await this.tokens.consume('PASSWORD_RESET', token, tx);

      if (subject.type === 'STUDENT') {
        await tx.student.update({ where: { id: subject.id }, data: reset });
      } else {
        const applicant = await tx.applicant.findUniqueOrThrow({
          where: { id: subject.id },
        });

        // Le lien reçu par e-mail prouve aussi la possession de l'adresse.
        await tx.applicant.update({
          where: { id: subject.id },
          data: {
            ...reset,
            emailVerifiedAt: applicant.emailVerifiedAt ?? new Date(),
          },
        });
      }

      await this.audit.record(
        {
          actor: { type: subject.type, id: subject.id, ip: meta.ip },
          action: 'PASSWORD_RESET_COMPLETED',
          entityType: subject.type === 'STUDENT' ? 'Student' : 'Applicant',
          entityId: subject.id,
        },
        tx,
      );
    });

    // Toutes les sessions ouvertes avec l'ancien mot de passe sont fermées.
    await this.sessions.revokeAll(subject);

    return { success: true };
  }
}
