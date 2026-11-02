import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractMember } from '../../../domain/entities/contract-member.entity';

export class ContractMemberListItemResponseDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id: Uuid;

  @ApiProperty({ type: String, format: 'uuid' })
  contractId: Uuid;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  tenantId: Uuid | null;

  @ApiProperty({ type: String, nullable: true })
  tenantName: string | null;

  @ApiProperty({ type: String, nullable: true })
  tenantPhone: string | null;

  @ApiProperty({ format: 'date' })
  joinedAt: string;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  leftAt: string | null;

  @ApiProperty({ enum: ['active', 'left'] })
  status: 'active' | 'left';

  static fromDomain(member: ContractMember): ContractMemberListItemResponseDto {
    return Object.assign(new ContractMemberListItemResponseDto(), {
      id: member.id,
      contractId: member.contractId,
      tenantId: member.tenantId,
      tenantName: member.tenantName,
      tenantPhone: member.tenantPhone?.value ?? null,
      joinedAt: member.joinedAt.toISOString().slice(0, 10),
      leftAt: member.leftAt?.toISOString().slice(0, 10) ?? null,
      status: member.status,
    });
  }
}
