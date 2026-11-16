import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RoommateProfileService } from '../../roommate-profile.service';
import { GetRoommateProfileQuery } from './get-roommate-profile.query';

@QueryHandler(GetRoommateProfileQuery)
export class GetRoommateProfileQueryHandler implements IQueryHandler<GetRoommateProfileQuery> {
  constructor(private readonly service: RoommateProfileService) {}
  execute(query: GetRoommateProfileQuery) {
    return this.service.detail(query.viewerId, query.profileId);
  }
}
