import { isIBAN } from 'class-validator';
import { fieldCipher, type FieldCipher } from './field-cipher';

/** IBAN sans espaces, en majuscules. */
export function normalizeIban(value: string) {
  return value.replace(/\s+/g, '').toUpperCase();
}

/**
 * IBAN international du registre ISO 13616 (SWIFT) : format du pays et clé mod-97.
 * Les boursiers sont payés sur des comptes du pays d'études (France, Europe,
 * Maghreb…), pas sur des comptes sénégalais.
 */
export function isValidIban(value: string) {
  return isIBAN(normalizeIban(value));
}

/** Affichage masqué : 4 premiers et 4 derniers caractères, groupés par 4. */
export function maskIban(iban: string) {
  const normalized = normalizeIban(iban);

  if (normalized.length <= 8) {
    return normalized;
  }

  const masked = `${normalized.slice(0, 4)}${'*'.repeat(normalized.length - 8)}${normalized.slice(-4)}`;

  return masked.replace(/(.{4})(?=.)/g, '$1 ');
}

export type ProtectedIban = {
  ibanCiphertext: string;
  ibanFingerprint: string;
  ibanLast4: string;
  ibanMasked: string;
};

/** Colonnes à persister pour un IBAN : jamais le texte clair. */
export function protectIban(
  iban: string,
  cipher: FieldCipher = fieldCipher,
): ProtectedIban {
  const normalized = normalizeIban(iban);

  return {
    ibanCiphertext: cipher.encrypt(normalized),
    ibanFingerprint: cipher.fingerprint(normalized),
    ibanLast4: normalized.slice(-4),
    ibanMasked: maskIban(normalized),
  };
}
