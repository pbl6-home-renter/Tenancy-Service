import { ApiProperty } from '@nestjs/swagger';
import { ContractTenantGetByIdResult } from '../../../application/queries/contract-tenant-get-by-id/contract-tenant-get-by-id.result';
import { ContractTenantListItemResponseDto } from './contract-tenant-list-item.response.dto';
import { ContractTenantMembershipResponseDto } from './contract-tenant-membership.response.dto';

export class ContractTenantDetailResponseDto extends ContractTenantListItemResponseDto {
  @ApiProperty({
    type: [ContractTenantMembershipResponseDto],
    description:
      'One row per eligible stay, including repeated stays on the same contract; joinedAt asc, member id asc.',
  })
  memberships: ContractTenantMembershipResponseDto[];

  static override fromReadModel(
    result: ContractTenantGetByIdResult,
  ): ContractTenantDetailResponseDto {
    const dto = new ContractTenantDetailResponseDto();
    Object.assign(dto, ContractTenantListItemResponseDto.fromReadModel(result));
    dto.memberships = result.memberships.map(
      ContractTenantMembershipResponseDto.fromReadModel,
    );
    return dto;
  }
}
