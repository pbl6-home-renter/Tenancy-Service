import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserAvatarUrls } from '../../../application/queries/user-avatar-lookup/user-avatar-lookup.query.handler';
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

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'URL avatar hiện tại của tenant (Identity); null nếu chưa có.',
  })
  tenantAvatarUrl: string | null;

  @ApiProperty({ format: 'date' })
  joinedAt: string;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  leftAt: string | null;

  @ApiProperty({ enum: ['active', 'left'] })
  status: 'active' | 'left';

  static fromDomain(
    member: ContractMember,
    avatars?: UserAvatarUrls,
  ): ContractMemberListItemResponseDto {
    return Object.assign(new ContractMemberListItemResponseDto(), {
      id: member.id,
      contractId: member.contractId,
      tenantId: member.tenantId,
      tenantName: member.tenantName,
      tenantPhone: member.tenantPhone?.value ?? null,
      tenantAvatarUrl: member.tenantId
        ? (avatars?.get(member.tenantId.toLowerCase()) ?? null)
        : null,
      joinedAt: member.joinedAt.toISOString().slice(0, 10),
      leftAt: member.leftAt?.toISOString().slice(0, 10) ?? null,
      status: member.status,
    });
  }
}
