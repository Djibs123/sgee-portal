import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Envoi d'e-mails transactionnels. Avec `SMTP_URL` : envoi réel via nodemailer.
 * Sans : message écrit dans les logs (dev) et conservé en mémoire (tests e2e).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transport: Transporter | null = env.SMTP_URL
    ? nodemailer.createTransport(env.SMTP_URL)
    : null;

  /** Boîte d'envoi en mémoire, alimentée uniquement sans SMTP (dev et tests). */
  readonly outbox: MailMessage[] = [];

  async send(message: MailMessage) {
    if (this.transport) {
      await this.transport.sendMail({ from: env.MAIL_FROM, ...message });
      return;
    }

    this.outbox.push(message);

    // Borne la mémoire d'un serveur de dev qui tourne longtemps.
    if (this.outbox.length > 100) {
      this.outbox.shift();
    }

    this.logger.log(
      `E-mail non envoyé (SMTP_URL absent) à ${message.to} : ${message.subject}\n${message.text}`,
    );
  }

  /** Lien absolu vers une page du portail. */
  link(path: string, params: Record<string, string>) {
    const url = new URL(path, env.PUBLIC_APP_URL);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }
}
