import { IQuery } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class IssueContextLookupQuery implements IQuery {
  constructor(
    readonly by: 'room' | 'contract',
    readonly id: Uuid,
  ) {}
}
