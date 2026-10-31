import { IQuery } from '@nestjs/cqrs';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class ContractGetByIdQuery implements IQuery {
  constructor(
    public readonly contractId: Uuid,
    public readonly user: AuthenticatedUser,
  ) {}
}
