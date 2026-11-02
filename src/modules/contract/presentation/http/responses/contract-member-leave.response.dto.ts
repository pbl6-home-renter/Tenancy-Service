import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractMember } from '../../../domain/entities/contract-member.entity';

export class ContractMemberLeaveResponseDto {
  @ApiProperty({ type: String, format: 'uuid', nullable: false })
  id: Uuid;

  @ApiProperty({ type: String, format: 'date', nullable: false })
  leftAt: string;

  static fromDomain(member: ContractMember): ContractMemberLeaveResponseDto {
    return Object.assign(new ContractMemberLeaveResponseDto(), {
      id: member.id,
      leftAt: member.leftAt?.toISOString().slice(0, 10) ?? null,
    });
  }
}
