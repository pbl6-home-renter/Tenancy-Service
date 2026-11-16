import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RoommateProfileService } from '../../roommate-profile.service';
import { RoommateProfileGetByIdQuery } from './roommate-profile-get-by-id.query';

@QueryHandler(RoommateProfileGetByIdQuery)
export class RoommateProfileGetByIdQueryHandler implements IQueryHandler<RoommateProfileGetByIdQuery> {
  constructor(private readonly service: RoommateProfileService) {}
  execute(query: RoommateProfileGetByIdQuery) {
    return this.service.detail(query.viewerId, query.profileId);
  }
}
