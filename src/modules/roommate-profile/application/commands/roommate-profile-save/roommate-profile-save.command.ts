import { ICommand } from '@nestjs/cqrs';
import { RoommateProfileDetailsInput } from '../../../domain/value-objects/roommate-profile-details.vo';

export interface RoommateProfileSaveInput extends RoommateProfileDetailsInput {}

export class RoommateProfileSaveCommand implements ICommand {
  constructor(
    readonly tenantId: string,
    readonly details: RoommateProfileSaveInput,
  ) {}
}
