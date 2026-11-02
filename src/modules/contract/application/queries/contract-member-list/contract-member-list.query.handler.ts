import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractMember } from '../../../domain/entities/contract-member.entity';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractMemberRepository } from '../../../domain/repositories/contract-member.repository';
import { ContractNotFoundException } from '../../../domain/exceptions/contract-not-found.exception';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { ContractMemberListQuery } from './contract-member-list.query';

@QueryHandler(ContractMemberListQuery)
export class ContractMemberListQueryHandler implements IQueryHandler<
  ContractMemberListQuery,
  PaginatedResult<ContractMember>
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
  ) {}

  async execute(
    query: ContractMemberListQuery,
  ): Promise<PaginatedResult<ContractMember>> {
    const contract = await this.contracts.findById(query.contractId);
    if (!contract) throw new ContractNotFoundException(query.contractId);
    const isOwner =
      query.user.role === UserRole.LANDLORD &&
      contract.landlordId === query.user.id;
    const isTenant =
      query.user.role === UserRole.TENANT &&
      (contract.tenantId === query.user.id ||
        (await this.members.existsActiveByContractAndTenant(
          contract.id,
          query.user.id,
        )));
    if (!isOwner && !isTenant) throw new ContractForbiddenException();
    return this.members.findPageByContract(contract.id, query.options);
  }
}
