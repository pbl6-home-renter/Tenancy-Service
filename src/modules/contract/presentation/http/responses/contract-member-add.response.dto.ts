import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractMember } from '../../../domain/entities/contract-member.entity';

export class ContractMemberAddResponseDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: false })
  id: Uuid;

  @ApiProperty({ type: String, format: 'uuid', nullable: false })
  contractId: Uuid;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  tenantId: Uuid | null;

  @ApiProperty({ type: String, format: 'date', nullable: false })
  joinedAt: string;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  leftAt: string | null;

  static fromDomain(member: ContractMember): ContractMemberAddResponseDto {
    return Object.assign(new ContractMemberAddResponseDto(), {
      id: member.id,
      contractId: member.contractId,
      tenantId: member.tenantId,
      joinedAt: member.joinedAt.toISOString().slice(0, 10),
      leftAt: member.leftAt?.toISOString().slice(0, 10) ?? null,
    });
  }
}
