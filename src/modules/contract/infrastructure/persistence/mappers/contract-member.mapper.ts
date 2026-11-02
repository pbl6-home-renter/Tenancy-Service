import { ContractMember } from '../../../domain/entities/contract-member.entity';
import { ContractMemberTypeormEntity } from '../contract-member.entity';

export class ContractMemberMapper {
  static toDomain(raw: ContractMemberTypeormEntity): ContractMember {
    return ContractMember.reconstitute({
      id: raw.id,
      contractId: raw.contractId,
      tenantId: raw.tenantId,
      tenantName: raw.tenantName,
      tenantPhone: raw.tenantPhone,
      joinedAt: raw.joinedAt,
      leftAt: raw.leftAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(member: ContractMember): ContractMemberTypeormEntity {
    return Object.assign(new ContractMemberTypeormEntity(), {
      id: member.id,
      contractId: member.contractId,
      tenantId: member.tenantId,
      tenantName: member.tenantName,
      tenantPhone: member.tenantPhone?.value ?? null,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      isDeleted: member.isDeleted,
    });
  }
}
