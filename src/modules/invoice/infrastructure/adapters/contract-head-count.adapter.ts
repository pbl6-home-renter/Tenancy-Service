import { Inject, Injectable } from '@nestjs/common';
import { CONTRACT_DI_TOKEN } from 'modules/contract/contract.di-token';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractHeadCountPort } from '../../application/ports/contract-head-count.port';

@Injectable()
export class ContractHeadCountAdapter implements ContractHeadCountPort {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly members: ContractMemberRepository,
  ) {}

  countActiveMembers(
    contractId: Uuid,
    periodStart: string,
    periodEnd: string,
    context?: TransactionContext,
  ): Promise<number> {
    return this.members.countHeadsInPeriod(
      contractId,
      periodStart,
      periodEnd,
      context,
    );
  }
}
