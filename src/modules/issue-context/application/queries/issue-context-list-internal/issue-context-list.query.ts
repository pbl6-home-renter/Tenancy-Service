import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';

export class IssueContextListQuery implements IQuery {
  constructor(
    readonly userId: Uuid,
    readonly role: UserRole,
  ) {}
}
