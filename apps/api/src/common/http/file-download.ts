import type { Response } from 'express';
import type { ResolvedDownload } from '../uploads/uploaded-files.service';

function toAsciiFilename(filename: string) {
  const normalized = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/["\\]/g, '')
    .trim();

  return normalized || 'document';
}

function encodeRfc5987Value(value: string) {
  return encodeURIComponent(value)
    .replace(
      /['()]/g,
      (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    )
    .replace(/\*/g, '%2A');
}

/** En-tête `Content-Disposition` compatible anciens navigateurs et UTF-8 (RFC 6266 / 5987). */
export function contentDispositionAttachment(filename: string) {
  return `attachment; filename="${toAsciiFilename(filename)}"; filename*=UTF-8''${encodeRfc5987Value(filename)}`;
}

/**
 * Envoie une pièce justificative en pièce jointe, sans exécution possible dans le
 * navigateur (CSP bac à sable, nosniff) et sans mise en cache partagée.
 */
export function sendFileDownload(response: Response, file: ResolvedDownload) {
  response.setHeader('Content-Type', file.mimeType);
  response.setHeader(
    'Content-Disposition',
    contentDispositionAttachment(file.originalName),
  );
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  response.setHeader('Cache-Control', 'private, no-store');

  return response.sendFile(file.absolutePath);
}
