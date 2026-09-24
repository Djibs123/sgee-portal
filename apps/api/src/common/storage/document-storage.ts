import { existsSync, realpathSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { env } from '../../config/env';

export type StoredObject = {
  /** Nom de fichier généré côté serveur. */
  fileName: string;
  /** Clé persistée en base (`StudentDocument.storagePath`). */
  storagePath: string;
};

/**
 * Stockage des pièces justificatives. L'implémentation locale peut être remplacée
 * par un stockage objet (S3, MinIO…) sans toucher aux services métier.
 */
export abstract class DocumentStorage {
  abstract save(content: Buffer, fileName: string): Promise<StoredObject>;

  /** Chemin absolu lisible, ou `null` si la clé est inconnue ou hors du répertoire autorisé. */
  abstract resolve(storagePath: string): string | null;

  /** Suppression best effort : l'état en base fait foi. */
  abstract remove(storagePath: string | null | undefined): Promise<void>;
}

function isInsideDirectory(filePath: string, directoryPath: string) {
  return (
    filePath === directoryPath || filePath.startsWith(`${directoryPath}${sep}`)
  );
}

/**
 * Racine de stockage. `UPLOAD_DIR` peut être relatif au répertoire de travail
 * (recommandé : les clés enregistrées en base restent portables) ou absolu :
 * `resolve` traite les deux cas, là où `join` produirait `/app/app/uploads`.
 */
export function storageRoot(cwd: string, uploadDir: string) {
  return resolve(cwd, uploadDir.replace(/[\\/]+$/, ''));
}

@Injectable()
export class LocalDiskStorage extends DocumentStorage {
  private readonly logger = new Logger(LocalDiskStorage.name);
  private readonly relativeRoot = env.UPLOAD_DIR.replace(/[\\/]+$/, '');

  private get root() {
    return storageRoot(process.cwd(), this.relativeRoot);
  }

  async save(content: Buffer, fileName: string): Promise<StoredObject> {
    await mkdir(this.root, { recursive: true });
    // `wx` : échoue plutôt que d'écraser un fichier existant.
    await writeFile(join(this.root, fileName), content, { flag: 'wx' });

    return { fileName, storagePath: `${this.relativeRoot}/${fileName}` };
  }

  resolve(storagePath: string): string | null {
    if (!existsSync(this.root)) {
      return null;
    }

    const resolvedPath = resolve(process.cwd(), storagePath);

    if (!existsSync(resolvedPath)) {
      return null;
    }

    // realpath neutralise les liens symboliques et les `..`.
    const realFilePath = realpathSync(resolvedPath);

    return isInsideDirectory(realFilePath, realpathSync(this.root))
      ? realFilePath
      : null;
  }

  async remove(storagePath: string | null | undefined) {
    if (!storagePath) {
      return;
    }

    try {
      const filePath = this.resolve(storagePath);

      if (filePath) {
        await rm(filePath);
      }
    } catch (error) {
      this.logger.warn(
        `Suppression impossible de ${storagePath}: ${String(error)}`,
      );
    }
  }
}
