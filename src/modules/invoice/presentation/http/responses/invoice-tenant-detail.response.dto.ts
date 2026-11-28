import { ApiProperty, OmitType } from '@nestjs/swagger';
import { InvoiceDetailView } from '../../../application/ports/invoice-read.port';
import { InvoiceDetailResponseDto } from './invoice-detail.response.dto';

export class InvoiceTenantDetailResponseDto extends OmitType(
  InvoiceDetailResponseDto,
  ['voidReason'] as const,
) {
  @ApiProperty({ type: Boolean }) landlordLocked: boolean;

  static fromView(view: InvoiceDetailView): InvoiceTenantDetailResponseDto {
    const response = Object.assign(
      new InvoiceTenantDetailResponseDto(),
      InvoiceDetailResponseDto.fromView(view),
    );
    response.landlordLocked = view.landlordLocked ?? false;
    Reflect.deleteProperty(response, 'voidReason');
    return response;
  }
}
