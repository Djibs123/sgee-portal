import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../auth/auth.constants';
import { assertAcceptablePassword } from '../auth/password/password.policy';
import { checkCredentials } from '../auth/session/credentials';
import {
  SessionService,
  type ClientMeta,
} from '../auth/session/session.service';
import { OneTimeTokenService } from '../auth/tokens/one-time-token.service';
import type { Applicant, Student } from '../generated/prisma/client';
import { MailerService } from '../mail/mailer.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ApplicantLoginDto,
  RegisterApplicantDto,
} from './applicant-auth.dto';
import {
  isApplicantTokenPayload,
  type ApplicantTokenPayload,
} from './applicant-auth.types';

/** Réponse identique que l'adresse soit connue ou non (anti-énumération). */
export const REGISTRATION_ACCEPTED = {
  message:
    'Si cette adresse peut être utilisée, un e-mail de confirmation vient d’être envoyé.',
};

const INVALID_CREDENTIALS =
  'Identifiants invalides ou compte temporairement verrouillé';

@Injectable()
export class ApplicantAuthService {
  private readonly logger = new Logger(ApplicantAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessions: SessionService,
    private readonly tokens: OneTimeTokenService,
    private readonly mailer: MailerService,
    private readonly audit: AuditService,
  ) {}

  async register(data: RegisterApplicantDto, meta: ClientMeta) {
    const birthDate = new Date(`${data.birthDate}T00:00:00Z`);
    const age =
      (Date.now() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000);

    if (Number.isNaN(birthDate.getTime()) || age < 15 || age > 80) {
      throw new BadRequestException('Date de naissance invalide');
    }

    assertAcceptablePassword(data.password, data.email);

    const existing = await this.prisma.applicant.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      // Même réponse qu'une inscription réussie ; l'ancien compte n'est pas modifié.
      if (!existing.emailVerifiedAt) {
        await this.sendVerification(existing);
      }

      return REGISTRATION_ACCEPTED;
    }

    const applicant = await this.prisma.applicant.create({
      data: {
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 12),
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate,
        phone: data.phone ?? null,
      },
    });

    await this.audit.record({
      actor: { type: 'APPLICANT', id: applicant.id, ip: meta.ip },
      action: 'APPLICANT_REGISTERED',
      entityType: 'Applicant',
      entityId: applicant.id,
    });
    await this.sendVerification(applicant);

    return REGISTRATION_ACCEPTED;
  }

  async resendVerification(email: string) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { email },
    });

    if (applicant && !applicant.emailVerifiedAt) {
      await this.sendVerification(applicant);
    }

    return REGISTRATION_ACCEPTED;
  }

  async verifyEmail(token: string, meta: ClientMeta) {
    const subject = await this.tokens.consume('EMAIL_VERIFICATION', token);

    if (subject.type !== 'APPLICANT') {
      throw new BadRequestException('Lien invalide ou expiré');
    }

    await this.prisma.applicant.update({
      where: { id: subject.id },
      data: { emailVerifiedAt: new Date() },
    });
    await this.audit.record({
      actor: { type: 'APPLICANT', id: subject.id, ip: meta.ip },
      action: 'EMAIL_VERIFIED',
      entityType: 'Applicant',
      entityId: subject.id,
    });

    return { success: true };
  }

  async login(input: ApplicantLoginDto, meta: ClientMeta) {
    const now = new Date();
    const applicant = await this.prisma.applicant.findUnique({
      where: { email: input.email },
    });
    const check = await checkCredentials(applicant, input.password, now);

    if (!applicant || check.outcome !== 'ok') {
      if (applicant && check.outcome !== 'ok') {
        if (check.nextState) {
          await this.prisma.applicant.update({
            where: { id: applicant.id },
            data: check.nextState,
          });
        }

        await this.audit.record({
          actor: { type: 'APPLICANT', id: applicant.id, ip: meta.ip },
          action:
            check.outcome === 'locked'
              ? 'AUTH_ACCOUNT_LOCKED'
              : 'AUTH_LOGIN_FAILED',
          entityType: 'Applicant',
          entityId: applicant.id,
        });
      }

      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!applicant.emailVerifiedAt) {
      throw new ForbiddenException(
        'Confirmez votre adresse e-mail avant de vous connecter',
      );
    }

    const updated = await this.prisma.applicant.update({
      where: { id: applicant.id },
      data: { lastLoginAt: now, failedLoginAttempts: 0, lockedUntil: null },
      include: { student: { select: { studentNumber: true } } },
    });
    const session = await this.sessions.create(
      { type: 'APPLICANT', id: applicant.id },
      meta,
    );
    const payload: ApplicantTokenPayload = {
      sub: applicant.id,
      sid: session.id,
      applicantId: applicant.id,
      typ: 'applicant',
    };

    await this.audit.record({
      actor: { type: 'APPLICANT', id: applicant.id, ip: meta.ip },
      action: 'AUTH_LOGIN_SUCCEEDED',
      entityType: 'Applicant',
      entityId: applicant.id,
    });

    return {
      token: await this.jwtService.signAsync(payload, {
        secret: JWT_SECRET,
        expiresIn: JWT_EXPIRES_IN,
      }),
      applicant: this.map(updated),
    };
  }

  async logout(token: unknown) {
    if (typeof token === 'string' && token !== '') {
      try {
        const payload = await this.jwtService.verifyAsync<
          Record<string, unknown>
        >(token, { secret: JWT_SECRET, ignoreExpiration: true });

        if (isApplicantTokenPayload(payload)) {
          await this.sessions.revoke(payload.sid);
        }
      } catch {
        // Jeton illisible : rien à révoquer.
      }
    }

    return { success: true };
  }

  async me(applicantId: string) {
    const applicant = await this.prisma.applicant.findUniqueOrThrow({
      where: { id: applicantId },
      include: { student: { select: { studentNumber: true } } },
    });

    return this.map(applicant);
  }

  private async sendVerification(applicant: Applicant) {
    const token = await this.tokens.issue('EMAIL_VERIFICATION', {
      type: 'APPLICANT',
      id: applicant.id,
    });
    const link = this.mailer.link('/candidature/verifier-email', { token });

    // Envoi non bloquant : le temps de réponse ne dépend pas du serveur SMTP.
    void this.mailer
      .send({
        to: applicant.email,
        subject: 'Confirmez votre adresse e-mail – Portail SGEE',
        text: [
          `Bonjour ${applicant.firstName},`,
          '',
          'Pour activer votre compte candidat, ouvrez ce lien (valable 24 heures) :',
          link,
          '',
          'Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.',
          '',
          'Service de Gestion des Étudiants sénégalais à l’Étranger',
        ].join('\n'),
      })
      .catch((error: unknown) =>
        this.logger.error(
          `Envoi de l’e-mail de vérification impossible : ${String(error)}`,
        ),
      );
  }

  private map(
    applicant: Applicant & { student: Pick<Student, 'studentNumber'> | null },
  ) {
    return {
      id: applicant.id,
      email: applicant.email,
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      birthDate: applicant.birthDate.toISOString().slice(0, 10),
      phone: applicant.phone,
      emailVerified: Boolean(applicant.emailVerifiedAt),
      /** Renseigné quand la bourse a été attribuée : le compte boursier est actif. */
      studentNumber: applicant.student?.studentNumber ?? null,
    };
  }
}
