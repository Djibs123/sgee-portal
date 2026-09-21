import { contentDispositionAttachment } from './file-download';

describe('contentDispositionAttachment', () => {
  it('fournit une version ASCII et une version UTF-8 du nom', () => {
    expect(contentDispositionAttachment('relevé accentué.pdf')).toBe(
      `attachment; filename="releve accentue.pdf"; filename*=UTF-8''relev%C3%A9%20accentu%C3%A9.pdf`,
    );
  });

  it('neutralise les guillemets et barres obliques inverses', () => {
    expect(contentDispositionAttachment('a"b\\c.pdf')).toContain(
      'filename="abc.pdf"',
    );
  });

  it('utilise un nom par défaut si rien n’est affichable', () => {
    expect(contentDispositionAttachment('文件')).toContain(
      'filename="document"',
    );
  });
});
