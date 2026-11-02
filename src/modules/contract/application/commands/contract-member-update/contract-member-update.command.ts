import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { TenantPhone } from '../../../domain/value-objects/tenant-phone.vo';

export class ContractMemberUpdateCommand implements ICommand {
  constructor(
    public readonly tenantId: Uuid,
    public readonly contractId: Uuid,
    public readonly landlordId: Uuid,
    public readonly tenantPhone: TenantPhone | null,
  ) {}
}
