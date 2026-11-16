import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RoommateProfileService } from '../../roommate-profile.service';
import { RoommateProfileSaveCommand } from './roommate-profile-save.command';

@CommandHandler(RoommateProfileSaveCommand)
export class RoommateProfileSaveCommandHandler implements ICommandHandler<RoommateProfileSaveCommand> {
  constructor(private readonly service: RoommateProfileService) {}
  execute(command: RoommateProfileSaveCommand) {
    return this.service.save(command.tenantId, command.details);
  }
}
