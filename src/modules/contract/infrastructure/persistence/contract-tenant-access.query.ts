import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractMemberTypeormEntity } from './contract-member.entity';

/** The same current-contract rule used by /me/contracts and /me/invoices. */
export function applyContractTenantAccess<T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  tenantId: Uuid,
  contractAlias = 'contract',
): void {
  const membership = query
    .subQuery()
    .select('1')
    .from(ContractMemberTypeormEntity, 'member')
    .where(`member.contractId = ${contractAlias}.id`)
    .andWhere('member.tenantId = :tenantId')
    .andWhere('member.isDeleted = false')
    .andWhere('(member.leftAt IS NULL OR member.leftAt > :today)');

  query
    .andWhere(
      new Brackets((builder) => {
        builder
          .where(`${contractAlias}.tenantId = :tenantId`)
          .orWhere(`EXISTS ${membership.getQuery()}`);
      }),
    )
    .setParameters({
      tenantId,
      today: new Date().toISOString().slice(0, 10),
    });
}
