import { mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads/student-documents';

const maxUploadSizeMb = Number(process.env.MAX_UPLOAD_SIZE_MB ?? '5');

export const MAX_UPLOAD_SIZE_BYTES =
  Number.isFinite(maxUploadSizeMb) && maxUploadSizeMb > 0
    ? maxUploadSizeMb * 1024 * 1024
    : 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
]);

export const uploadRoot = () => join(process.cwd(), UPLOAD_DIR);

export const studentDocumentStorage = diskStorage({
  destination: (_request, _file, callback) => {
    const destination = uploadRoot();

    mkdirSync(destination, {
      recursive: true,
    });

    callback(null, destination);
  },
  filename: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();

    callback(null, `${randomUUID()}${extension}`);
  },
});

export function studentDocumentFileFilter(
  _request: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(new BadRequestException('Type de fichier non autorise'), false);
    return;
  }

  callback(null, true);
}
