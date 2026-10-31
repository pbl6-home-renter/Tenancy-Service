import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractCreateCommand implements ICommand {
  constructor(
    public readonly landlordId: Uuid,
    public readonly roomId: Uuid,
    public readonly tenantId: Uuid | null,
    public readonly tenantName: string | null,
    public readonly tenantPhone: string | null,
    public readonly depositAmount: number,
    public readonly rentPrice: number,
    public readonly startDate: string,
    public readonly endDate: string,
    public readonly vehicleCount: number | null,
  ) {}
}
