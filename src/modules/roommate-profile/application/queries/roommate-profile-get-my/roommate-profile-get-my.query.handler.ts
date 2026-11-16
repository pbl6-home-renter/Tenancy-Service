import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RoommateProfileService } from '../../roommate-profile.service';
import { RoommateProfileGetMyQuery } from './roommate-profile-get-my.query';

@QueryHandler(RoommateProfileGetMyQuery)
export class RoommateProfileGetMyQueryHandler implements IQueryHandler<RoommateProfileGetMyQuery> {
  constructor(private readonly service: RoommateProfileService) {}
  execute(query: RoommateProfileGetMyQuery) {
    return this.service.mine(query.tenantId);
  }
}
