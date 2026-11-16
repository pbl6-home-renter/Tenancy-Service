import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RoommateProfileService } from '../../roommate-profile.service';
import { RoommateProfileSearchQuery } from './roommate-profile-search.query';

@QueryHandler(RoommateProfileSearchQuery)
export class RoommateProfileSearchQueryHandler implements IQueryHandler<RoommateProfileSearchQuery> {
  constructor(private readonly service: RoommateProfileService) {}
  execute(query: RoommateProfileSearchQuery) {
    return this.service.search(query.viewerId, query.options);
  }
}
