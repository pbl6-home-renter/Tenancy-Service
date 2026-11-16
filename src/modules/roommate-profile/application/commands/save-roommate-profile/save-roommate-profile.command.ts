import { ICommand } from '@nestjs/cqrs';
import { RoommateProfileDetailsInput } from '../../../domain/value-objects/roommate-profile-details.vo';

export class SaveRoommateProfileCommand implements ICommand {
  constructor(
    readonly tenantId: string,
    readonly details: RoommateProfileDetailsInput,
  ) {}
}
