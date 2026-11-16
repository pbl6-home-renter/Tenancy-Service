import { RoommateProfileRecord } from '../domain/roommate-profile.types';

export type MyRoommateProfileResult = RoommateProfileRecord;

export interface PublicRoommateProfileResult extends RoommateProfileRecord {
  tenantName: string;
  avatarUrl: string | null;
}
