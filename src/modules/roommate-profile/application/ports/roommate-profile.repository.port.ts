import { RoommateProfileDetails } from '../../domain/value-objects/roommate-profile-details.vo';
import { RoommateProfileRecord } from '../../domain/roommate-profile.types';

export interface RoommateProfileRepositoryPort {
  save(
    tenantId: string,
    details: RoommateProfileDetails,
  ): Promise<RoommateProfileRecord>;
  findOwn(tenantId: string): Promise<RoommateProfileRecord | null>;
  findDiscoverable(id: string): Promise<RoommateProfileRecord | null>;
  findCandidates(
    viewerId: string,
    preferredArea?: string,
  ): Promise<RoommateProfileRecord[]>;
}
