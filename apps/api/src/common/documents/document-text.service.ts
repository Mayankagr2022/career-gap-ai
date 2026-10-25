import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { DOCX_MIME, PDF_MIME, TEXT_MIME } from './document-mime';

@Injectable()
export class DocumentTextService {
  private readonly logger = new Logger(DocumentTextService.name);

  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === PDF_MIME) {
      return this.extractFromPdf(buffer);
    } else if (mimeType === DOCX_MIME) {
      return this.extractFromDocx(buffer);
    } else if (mimeType === TEXT_MIME) {
      return this.extractFromText(buffer);
    } else {
      throw new BadRequestException(`Unsupported file type: ${mimeType}`);
    }
  }

  private async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text
        // eslint-disable-next-line no-control-regex
        .replace(/\x00/g, '') // Remove null bytes
        .replace(/\s{3,}/g, '\n') // Normalize whitespace
        .trim();

      if (!text || text.length < 50) {
        throw new BadRequestException('PDF appears to be empty or image-based. Please use a text-based PDF.');
      }

      this.logger.log(`Extracted ${text.length} chars from PDF`);
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to parse PDF: ${error.message}`);
    }
  }

  private async extractFromDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.trim();

      if (!text || text.length < 50) {
        throw new BadRequestException('Document appears to be empty');
      }

      this.logger.log(`Extracted ${text.length} chars from DOCX`);
      return text;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to parse DOCX: ${error.message}`);
    }
  }

  private extractFromText(buffer: Buffer): string {
    const text = buffer
      .toString('utf8')
      .replace(/^\uFEFF/, '') // BOM
      .replace(/\r\n?/g, '\n')
      .trim();

    if (!text || text.length < 50) {
      throw new BadRequestException('Text file appears to be empty');
    }

    this.logger.log(`Extracted ${text.length} chars from text file`);
    return text;
  }
}
