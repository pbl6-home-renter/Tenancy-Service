import { RoommateProfileRecord } from '../roommate-profile.types';
import { RoommateProfileDetails } from '../value-objects/roommate-profile-details.vo';

export interface RoommateProfileRepository {
  save(
    tenantId: string,
    details: RoommateProfileDetails,
  ): Promise<RoommateProfileRecord>;
  findOwn(tenantId: string): Promise<RoommateProfileRecord | null>;
}
