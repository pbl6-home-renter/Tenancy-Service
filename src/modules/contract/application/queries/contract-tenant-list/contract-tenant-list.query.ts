import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ContractTenantFilter } from '../../ports/contract-tenant-read.port';

export class ContractTenantListQuery {
  constructor(
    readonly landlordId: Uuid,
    readonly options: OffsetPageQuery<ContractTenantFilter>,
  ) {}
}
