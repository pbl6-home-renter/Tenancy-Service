import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractMemberNotFoundException } from '../../../domain/exceptions/contract-member-not-found.exception';
import { ContractTenantReadPort } from '../../ports/contract-tenant-read.port';
import { ContractTenantGetByIdQuery } from './contract-tenant-get-by-id.query';
import { ContractTenantGetByIdResult } from './contract-tenant-get-by-id.result';

@QueryHandler(ContractTenantGetByIdQuery)
export class ContractTenantGetByIdQueryHandler implements IQueryHandler<
  ContractTenantGetByIdQuery,
  ContractTenantGetByIdResult
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.TENANT_READ)
    private readonly read: ContractTenantReadPort,
  ) {}

  async execute(
    query: ContractTenantGetByIdQuery,
  ): Promise<ContractTenantGetByIdResult> {
    const result = await this.read.findByMemberId(
      query.landlordId,
      query.contractMemberId,
    );
    if (!result) throw new ContractMemberNotFoundException();
    return result;
  }
}
