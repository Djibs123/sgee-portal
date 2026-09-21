import { BadRequestException } from '@nestjs/common';

/** Recommandations NIST SP 800-63B : longueur plutôt que règles de composition. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON_PASSWORDS = new Set([
  '123456789012',
  '1234567890123',
  'password1234',
  'motdepasse123',
  'motdepasse1234',
  'azertyuiop12',
  'azertyuiop123',
  'qwertyuiop12',
  'senegal12345',
  'senegal2026!',
  'sgee12345678',
  'bienvenue123',
  'bienvenue1234',
]);

/**
 * Vérifications complémentaires à la longueur (déjà validée par le DTO) :
 * mots de passe triviaux ou dérivés de l'adresse e-mail.
 */
export function assertAcceptablePassword(password: string, email?: string) {
  const normalized = password.toLowerCase();
  const localPart = email?.split('@')[0]?.toLowerCase();

  if (COMMON_PASSWORDS.has(normalized) || /^(.)\1+$/.test(password)) {
    throw new BadRequestException('Ce mot de passe est trop courant');
  }

  if (localPart && localPart.length >= 4 && normalized.includes(localPart)) {
    throw new BadRequestException(
      'Le mot de passe ne doit pas contenir votre adresse e-mail',
    );
  }
}
