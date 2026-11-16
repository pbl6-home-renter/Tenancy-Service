import { ICommand } from '@nestjs/cqrs';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MatchRequestStatus } from '../../../domain/enums/match-request-status.enum';

export class MatchRequestTransitionCommand implements ICommand {
  constructor(
    readonly actorId: Uuid,
    readonly id: Uuid,
    readonly next: MatchRequestStatus,
  ) {}
}
