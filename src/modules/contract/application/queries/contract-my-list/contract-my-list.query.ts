import { IQuery } from '@nestjs/cqrs';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractListFilter } from '../../../domain/repositories/contract.repository';

export class ContractMyListQuery implements IQuery {
  constructor(
    public readonly tenantId: Uuid,
    public readonly options: OffsetPageQuery<ContractListFilter>,
  ) {}
}
