import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractTenantScope } from '../../../application/ports/contract-tenant-read.port';
import { ContractTenantListResult } from '../../../application/queries/contract-tenant-list/contract-tenant-list.result';

export class ContractTenantListItemResponseDto {
  @ApiProperty({
    format: 'uuid',
    description:
      'First eligible membership by joinedAt asc, id asc across the landlord group, independent of list filters.',
  })
  contractMemberId: Uuid;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'First nonempty membership name snapshot by joinedAt asc, id asc. No Identity lookup.',
  })
  tenantName: string | null;

  @ApiProperty()
  isLinked: boolean;

  @ApiProperty({ enum: ['current', 'history'] })
  scope: ContractTenantScope;

  @ApiProperty({
    minimum: 1,
    description: 'Distinct eligible contracts in this landlord group.',
  })
  contractCount: number;

  static fromReadModel(
    result: ContractTenantListResult,
  ): ContractTenantListItemResponseDto {
    const dto = new ContractTenantListItemResponseDto();
    dto.contractMemberId = result.contractMemberId;
    dto.tenantName = result.tenantName;
    dto.isLinked = result.isLinked;
    dto.scope = result.scope;
    dto.contractCount = result.contractCount;
    return dto;
  }
}
