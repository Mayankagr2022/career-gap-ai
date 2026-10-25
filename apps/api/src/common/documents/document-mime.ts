export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const TEXT_MIME = 'text/plain';

// Browsers (notably on Windows) sometimes send an empty or generic mimetype, so the type is
// derived from the file's magic bytes instead of trusting the client-supplied header.
export function detectMimeType(buffer: Buffer, opts: { allowText?: boolean } = {}): string | null {
  if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return PDF_MIME;
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return DOCX_MIME; // zip container
  if (opts.allowText && isPlainText(buffer)) return TEXT_MIME;
  return null;
}

/** No NUL bytes and valid UTF-8 end to end. */
function isPlainText(buffer: Buffer): boolean {
  if (buffer.subarray(0, 4096).includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return true;
  } catch {
    return false;
  }
}

// Multer decodes multipart filenames as latin1; recover UTF-8 names such as "résumé.pdf"
export function decodeFilename(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}
