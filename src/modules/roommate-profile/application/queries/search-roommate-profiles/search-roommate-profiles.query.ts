import { IQuery } from '@nestjs/cqrs';
import { ProfileSearchOptions } from '../../roommate-profile.service';

export class SearchRoommateProfilesQuery implements IQuery {
  constructor(
    readonly viewerId: string,
    readonly options: ProfileSearchOptions,
  ) {}
}
