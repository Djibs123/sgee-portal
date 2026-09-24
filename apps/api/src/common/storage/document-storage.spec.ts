import { resolve } from 'node:path';
import { storageRoot } from './document-storage';

describe('storageRoot', () => {
  const cwd = resolve('/app');

  it('résout un répertoire relatif au répertoire de travail', () => {
    expect(storageRoot(cwd, 'uploads/student-documents')).toBe(
      resolve(cwd, 'uploads/student-documents'),
    );
  });

  // `join` aurait produit /app/app/uploads : les pièces se seraient écrites hors du volume monté.
  it('accepte un répertoire absolu sans le préfixer du répertoire de travail', () => {
    const absolute = resolve('/app/uploads/student-documents');

    expect(storageRoot(cwd, absolute)).toBe(absolute);
  });

  it('ignore les séparateurs finaux', () => {
    expect(storageRoot(cwd, 'uploads/student-documents/')).toBe(
      resolve(cwd, 'uploads/student-documents'),
    );
  });
});
