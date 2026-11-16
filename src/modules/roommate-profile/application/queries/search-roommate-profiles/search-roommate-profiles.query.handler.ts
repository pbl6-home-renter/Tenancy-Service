import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RoommateProfileService } from '../../roommate-profile.service';
import { SearchRoommateProfilesQuery } from './search-roommate-profiles.query';

@QueryHandler(SearchRoommateProfilesQuery)
export class SearchRoommateProfilesQueryHandler implements IQueryHandler<SearchRoommateProfilesQuery> {
  constructor(private readonly service: RoommateProfileService) {}
  execute(query: SearchRoommateProfilesQuery) {
    return this.service.search(query.viewerId, query.options);
  }
}
