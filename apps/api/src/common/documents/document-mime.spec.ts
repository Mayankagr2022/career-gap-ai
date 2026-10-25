import { DOCX_MIME, PDF_MIME, TEXT_MIME, decodeFilename, detectMimeType } from './document-mime';

describe('detectMimeType', () => {
  it('detects PDF and DOCX by magic bytes', () => {
    expect(detectMimeType(Buffer.from('%PDF-1.7 ...'))).toBe(PDF_MIME);
    expect(detectMimeType(Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe(DOCX_MIME);
  });

  it('only accepts plain text when allowed', () => {
    const text = Buffer.from('Senior Engineer\nWe are hiring');
    expect(detectMimeType(text)).toBeNull();
    expect(detectMimeType(text, { allowText: true })).toBe(TEXT_MIME);
  });

  it('rejects binary and invalid UTF-8 even when text is allowed', () => {
    expect(detectMimeType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]), { allowText: true })).toBeNull();
    expect(detectMimeType(Buffer.from([0xff, 0xfe, 0xfa]), { allowText: true })).toBeNull();
  });

  it('accepts UTF-8 text with non-ASCII characters', () => {
    expect(detectMimeType(Buffer.from('Ingénieur logiciel — Paris'), { allowText: true })).toBe(TEXT_MIME);
  });
});

describe('decodeFilename', () => {
  it('recovers UTF-8 names that multer decoded as latin1', () => {
    const mangled = Buffer.from('résumé.pdf', 'utf8').toString('latin1');
    expect(decodeFilename(mangled)).toBe('résumé.pdf');
  });

  it('leaves plain ASCII names alone', () => {
    expect(decodeFilename('job.pdf')).toBe('job.pdf');
  });
});
