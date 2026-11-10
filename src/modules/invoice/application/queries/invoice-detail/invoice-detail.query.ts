import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';

export class InvoiceDetailQuery implements IQuery {
  constructor(
    readonly invoiceId: Uuid,
    readonly userId: Uuid,
    readonly role: UserRole,
  ) {}
}
