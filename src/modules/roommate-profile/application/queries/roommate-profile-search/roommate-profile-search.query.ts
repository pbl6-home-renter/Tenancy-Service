import { IQuery } from '@nestjs/cqrs';
import { ProfileSearchOptions } from '../../roommate-profile.service';

export class RoommateProfileSearchQuery implements IQuery {
  constructor(
    readonly viewerId: string,
    readonly options: ProfileSearchOptions,
  ) {}
}
