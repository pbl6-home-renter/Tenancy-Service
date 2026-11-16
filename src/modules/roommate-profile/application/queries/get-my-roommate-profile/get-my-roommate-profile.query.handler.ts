import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RoommateProfileService } from '../../roommate-profile.service';
import { GetMyRoommateProfileQuery } from './get-my-roommate-profile.query';

@QueryHandler(GetMyRoommateProfileQuery)
export class GetMyRoommateProfileQueryHandler implements IQueryHandler<GetMyRoommateProfileQuery> {
  constructor(private readonly service: RoommateProfileService) {}
  execute(query: GetMyRoommateProfileQuery) {
    return this.service.mine(query.tenantId);
  }
}
