import { FieldCipher } from './field-cipher';
import { isValidIban, maskIban, normalizeIban, protectIban } from './iban';

const cipher = new FieldCipher(Buffer.alloc(32, 1));
const otherCipher = new FieldCipher(Buffer.alloc(32, 2));
const IBAN = 'FR76 3000 6000 0112 3456 7890 189';

describe('FieldCipher', () => {
  it('chiffre de façon non déterministe et déchiffre', () => {
    const first = cipher.encrypt('secret');
    const second = cipher.encrypt('secret');

    expect(first).not.toBe(second);
    expect(first.startsWith('v1:')).toBe(true);
    expect(cipher.decrypt(first)).toBe('secret');
  });

  it('détecte toute altération ou mauvaise clé', () => {
    const payload = cipher.encrypt('secret');
    const [version, iv, tag, data] = payload.split(':');
    const tampered = [
      version,
      iv,
      tag,
      Buffer.from('autre').toString('base64'),
    ].join(':');

    expect(() => cipher.decrypt(tampered)).toThrow();
    expect(() => otherCipher.decrypt(payload)).toThrow();
    expect(() => cipher.decrypt(`v0:${iv}:${tag}:${data}`)).toThrow(/inconnu/);
  });

  it('produit une empreinte stable propre à la clé', () => {
    expect(cipher.fingerprint('x')).toBe(cipher.fingerprint('x'));
    expect(cipher.fingerprint('x')).not.toBe(otherCipher.fingerprint('x'));
  });
});

describe('IBAN', () => {
  it('valide les IBAN internationaux du registre (format et clé mod-97)', () => {
    expect(isValidIban(IBAN)).toBe(true);
    expect(isValidIban('fr76 3000 4000 0312 3456 7890 143')).toBe(true);
    expect(isValidIban('BE68539007547034')).toBe(true);
    expect(isValidIban('FR7612345678901234567890123')).toBe(false);
    expect(isValidIban('pas un iban')).toBe(false);
  });

  it('normalise et masque', () => {
    expect(normalizeIban(IBAN)).toBe('FR7630006000011234567890189');
    expect(maskIban(IBAN)).toBe('FR76 **** **** **** **** ***0 189');
  });

  it('ne conserve jamais le texte clair', () => {
    const stored = protectIban(IBAN, cipher);

    expect(JSON.stringify(stored)).not.toContain('30006000011234567890');
    expect(cipher.decrypt(stored.ibanCiphertext)).toBe(normalizeIban(IBAN));
    expect(stored.ibanLast4).toBe('0189');
    expect(stored.ibanFingerprint).toBe(
      protectIban('fr7630006000011234567890189', cipher).ibanFingerprint,
    );
  });
});
