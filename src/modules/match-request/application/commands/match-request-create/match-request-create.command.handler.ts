import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MatchRequestService } from '../../match-request.service';
import { MatchRequestCreateCommand } from './match-request-create.command';

@CommandHandler(MatchRequestCreateCommand)
export class MatchRequestCreateCommandHandler implements ICommandHandler<MatchRequestCreateCommand> {
  constructor(private readonly service: MatchRequestService) {}
  execute(command: MatchRequestCreateCommand) {
    return this.service.create(
      command.requesterId,
      command.targetId,
      command.idempotencyKey,
    );
  }
}
