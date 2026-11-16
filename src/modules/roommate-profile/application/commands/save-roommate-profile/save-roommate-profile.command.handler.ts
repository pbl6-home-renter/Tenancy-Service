import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RoommateProfileService } from '../../roommate-profile.service';
import { SaveRoommateProfileCommand } from './save-roommate-profile.command';

@CommandHandler(SaveRoommateProfileCommand)
export class SaveRoommateProfileCommandHandler implements ICommandHandler<SaveRoommateProfileCommand> {
  constructor(private readonly service: RoommateProfileService) {}
  execute(command: SaveRoommateProfileCommand) {
    return this.service.save(command.tenantId, command.details);
  }
}
