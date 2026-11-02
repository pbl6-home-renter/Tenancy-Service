import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractMember } from '../../../domain/entities/contract-member.entity';

export class ContractMemberUpdateResponseDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: false })
  id: Uuid;

  @ApiProperty({ type: String, nullable: false })
  tenantPhone: string;

  static fromDomain(member: ContractMember): ContractMemberUpdateResponseDto {
    return Object.assign(new ContractMemberUpdateResponseDto(), {
      id: member.id,
      tenantPhone: member.tenantPhone?.value ?? null,
    });
  }
}
