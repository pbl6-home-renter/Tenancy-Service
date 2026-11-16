import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MatchRequestService } from '../../match-request.service';
import { MatchRequestTransitionCommand } from './match-request-transition.command';

@CommandHandler(MatchRequestTransitionCommand)
export class MatchRequestTransitionCommandHandler implements ICommandHandler<MatchRequestTransitionCommand> {
  constructor(private readonly service: MatchRequestService) {}
  execute(command: MatchRequestTransitionCommand) {
    return this.service.transition(command.actorId, command.id, command.next);
  }
}
