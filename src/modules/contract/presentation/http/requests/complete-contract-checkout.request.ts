import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, isDateString, IsDefined } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractCheckoutCompleteCommand } from '../../../application/commands/contract-checkout-complete/contract-checkout-complete.command';

export class CompleteContractCheckoutRequest {
  @ApiProperty({ type: String, format: 'date', example: '2026-11-03' })
  @IsDefined()
  @Transform(
    ({ value }) =>
      typeof value === 'string' &&
      /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value) &&
      isDateString(value, { strict: true })
        ? new Date(`${value}T00:00:00.000Z`)
        : new Date(NaN),
    { toClassOnly: true },
  )
  @IsDate()
  completedOn: Date;

  static toCommand(
    request: CompleteContractCheckoutRequest,
    contractId: Uuid,
    landlordId: Uuid,
  ): ContractCheckoutCompleteCommand {
    return new ContractCheckoutCompleteCommand(
      contractId,
      landlordId,
      request.completedOn,
    );
  }
}
