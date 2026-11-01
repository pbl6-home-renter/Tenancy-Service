import { Injectable } from '@nestjs/common';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import { convert } from 'html-to-text';
import PDFDocument from 'pdfkit';
import {
  ContractDocumentRendererPort,
  ContractDocumentVariables,
} from '../../application/ports/contract-document-renderer.port';
import { ContractTemplateEntity } from '../../domain/entities/contract-template.entity';
import { TemplateDataInvalidException } from '../../domain/exceptions/template-data-invalid.exception';

@Injectable()
export class PdfContractDocumentRenderer implements ContractDocumentRendererPort {
  async render(
    template: ContractTemplateEntity,
    variables: ContractDocumentVariables,
  ): Promise<Buffer> {
    template.assertVariables(variables);
    let text: string;
    try {
      const render = Handlebars.compile(template.body);
      text = convert(render(variables), {
        wordwrap: false,
        selectors: [
          {
            selector: 'h1',
            options: { leadingLineBreaks: 0, trailingLineBreaks: 2 },
          },
          {
            selector: 'h2',
            options: { leadingLineBreaks: 2, trailingLineBreaks: 1 },
          },
          {
            selector: 'p',
            options: { leadingLineBreaks: 1, trailingLineBreaks: 1 },
          },
        ],
      });
    } catch {
      throw new TemplateDataInvalidException(
        'Unable to render the contract template',
      );
    }
    if (!text.trim()) {
      throw new TemplateDataInvalidException(
        'The contract document must not be empty',
      );
    }

    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.once('error', reject);
      document.once('end', () => resolve(Buffer.concat(chunks)));
      try {
        document.font(join(__dirname, 'fonts', 'DejaVuSans.ttf'));
        document.fontSize(11).text(text, { lineGap: 4 });
        document.end();
      } catch (error) {
        document.destroy();
        reject(error);
      }
    });
  }
}
