import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, Matches } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ContractMemberUpdateCommand } from '../../../application/commands/contract-member-update/contract-member-update.command';
import { TenantPhone } from '../../../domain/value-objects/tenant-phone.vo';

export class UpdateContractMemberRequest {
  static readonly unexpectedFieldCode = 'VALIDATION_FAILED';

  @ApiProperty({ type: String, format: 'uuid' })
  @IsDefined()
  @IsUuid('VALIDATION_FAILED')
  contractId: Uuid;

  @ApiProperty({ type: String, pattern: TenantPhone.PATTERN.source })
  @Matches(TenantPhone.PATTERN)
  tenantPhone: string;

  static toCommand(
    request: UpdateContractMemberRequest,
    tenantId: Uuid,
    landlordId: Uuid,
  ): ContractMemberUpdateCommand {
    return new ContractMemberUpdateCommand(
      tenantId,
      request.contractId,
      landlordId,
      TenantPhone.create(request.tenantPhone),
    );
  }
}
