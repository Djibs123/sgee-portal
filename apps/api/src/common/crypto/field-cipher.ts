import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto';
import { env } from '../../config/env';

const VERSION = 'v1';
const IV_LENGTH = 12;

/**
 * Chiffrement applicatif des champs sensibles (IBAN) : AES-256-GCM authentifié,
 * IV aléatoire par valeur, format versionné `v1:iv:tag:données` pour une future
 * rotation de clé. Deux sous-clés sont dérivées par HKDF de la clé maîtresse :
 * une pour chiffrer, une pour l'empreinte HMAC qui permet de détecter un même IBAN
 * utilisé par plusieurs comptes sans le déchiffrer.
 */
export class FieldCipher {
  private readonly encryptionKey: Buffer;
  private readonly fingerprintKey: Buffer;

  constructor(masterKey: Buffer) {
    if (masterKey.length !== 32) {
      throw new Error('La clé maîtresse doit faire 32 octets');
    }

    const derive = (info: string) =>
      Buffer.from(hkdfSync('sha256', masterKey, Buffer.alloc(0), info, 32));

    this.encryptionKey = derive('sgee:field-encryption:v1');
    this.fingerprintKey = derive('sgee:field-fingerprint:v1');
  }

  encrypt(plaintext: string) {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const data = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return [
      VERSION,
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      data.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string) {
    const [version, iv, tag, data] = payload.split(':');

    if (version !== VERSION || !iv || !tag || data === undefined) {
      throw new Error('Format de donnée chiffrée inconnu');
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'base64'),
    );

    decipher.setAuthTag(Buffer.from(tag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  fingerprint(value: string) {
    return createHmac('sha256', this.fingerprintKey)
      .update(value)
      .digest('hex');
  }
}

export const fieldCipher = new FieldCipher(
  Buffer.from(env.DATA_ENCRYPTION_KEY, 'base64'),
);
