import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, isDateString, IsDefined } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ContractMemberLeaveCommand } from '../../../application/commands/contract-member-leave/contract-member-leave.command';

export class LeaveContractMemberRequest {
  static readonly unexpectedFieldCode = 'VALIDATION_FAILED';

  @ApiProperty({ type: String, format: 'uuid' })
  @IsDefined()
  @IsUuid('VALIDATION_FAILED')
  contractId: Uuid;

  @ApiProperty({ type: String, format: 'date' })
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
  leftOn: Date;

  static toCommand(
    request: LeaveContractMemberRequest,
    tenantId: Uuid,
    landlordId: Uuid,
  ): ContractMemberLeaveCommand {
    return new ContractMemberLeaveCommand(
      tenantId,
      request.contractId,
      landlordId,
      request.leftOn,
    );
  }
}
