import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractTenantMembershipResult } from '../../../application/queries/contract-tenant-get-by-id/contract-tenant-get-by-id.result';
import { ContractStatus } from '../../../domain/enums/contract-status.enum';

export class ContractTenantMembershipResponseDto {
  @ApiProperty({ format: 'uuid' })
  contractMemberId: Uuid;

  @ApiProperty({ format: 'uuid' })
  contractId: Uuid;

  @ApiProperty({ format: 'uuid' })
  roomId: Uuid;

  @ApiProperty({ enum: ContractStatus })
  contractStatus: ContractStatus;

  @ApiProperty({ format: 'date' })
  joinedAt: string;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  leftAt: string | null;

  @ApiProperty()
  isCurrent: boolean;

  @ApiProperty({ type: String, nullable: true })
  tenantName: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Only this membership contact snapshot in Tenancy; null when absent.',
  })
  tenantPhone: string | null;

  static fromReadModel(
    result: ContractTenantMembershipResult,
  ): ContractTenantMembershipResponseDto {
    const dto = new ContractTenantMembershipResponseDto();
    dto.contractMemberId = result.contractMemberId;
    dto.contractId = result.contractId;
    dto.roomId = result.roomId;
    dto.contractStatus = result.contractStatus;
    dto.joinedAt = result.joinedAt;
    dto.leftAt = result.leftAt;
    dto.isCurrent = result.isCurrent;
    dto.tenantName = result.tenantName;
    dto.tenantPhone = result.tenantPhone;
    return dto;
  }
}
