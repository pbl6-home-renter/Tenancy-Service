import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export class MatchRequestCreateCommand implements ICommand {
  constructor(
    readonly requesterId: Uuid,
    readonly targetId: Uuid,
    readonly idempotencyKey: Uuid,
  ) {}
}
