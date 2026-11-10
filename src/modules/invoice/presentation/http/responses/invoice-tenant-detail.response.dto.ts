import { OmitType } from '@nestjs/swagger';
import { InvoiceDetailView } from '../../../application/ports/invoice-read.port';
import { InvoiceDetailResponseDto } from './invoice-detail.response.dto';

export class InvoiceTenantDetailResponseDto extends OmitType(
  InvoiceDetailResponseDto,
  ['voidReason'] as const,
) {
  static fromView(view: InvoiceDetailView): InvoiceTenantDetailResponseDto {
    const response = Object.assign(
      new InvoiceTenantDetailResponseDto(),
      InvoiceDetailResponseDto.fromView(view),
    );
    Reflect.deleteProperty(response, 'voidReason');
    return response;
  }
}
