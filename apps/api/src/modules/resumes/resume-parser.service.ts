import { Injectable } from '@nestjs/common';
import { DocumentTextService } from '../../common/documents/document-text.service';

@Injectable()
export class ResumeParserService {
  constructor(private readonly documents: DocumentTextService) {}

  extractText(buffer: Buffer, mimeType: string): Promise<string> {
    return this.documents.extractText(buffer, mimeType);
  }
}
