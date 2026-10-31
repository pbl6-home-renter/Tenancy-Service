import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { ContractNotFoundException } from '../../../domain/exceptions/contract-not-found.exception';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractGetByIdQuery } from './contract-get-by-id.query';

@QueryHandler(ContractGetByIdQuery)
export class ContractGetByIdQueryHandler implements IQueryHandler<
  ContractGetByIdQuery,
  ContractEntity
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contractRepository: ContractRepository,
  ) {}

  async execute(query: ContractGetByIdQuery): Promise<ContractEntity> {
    const contract = await this.contractRepository.findById(query.contractId);
    if (!contract) {
      throw new ContractNotFoundException(query.contractId);
    }
    const { user } = query;
    const isOwner =
      user.role === UserRole.LANDLORD && contract.landlordId === user.id;
    const isTenant =
      user.role === UserRole.TENANT && contract.tenantId === user.id;
    if (!isOwner && !isTenant) {
      throw new ContractForbiddenException();
    }
    return contract;
  }
}
