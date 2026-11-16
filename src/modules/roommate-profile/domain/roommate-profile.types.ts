export interface RoommateLifestyle {
  cleanAndTidy?: boolean;
  earlyBird?: boolean;
  nightOwl?: boolean;
  petFriendly?: boolean;
  smoking?: boolean;
  cooking?: boolean;
  guestsAllowed?: boolean;
}

export interface RoommateProfileRecord {
  id: string;
  tenantId: string;
  isVisible: boolean;
  bio: string | null;
  gender: string | null;
  birthYear: number | null;
  occupation: string | null;
  preferredProvince: string | null;
  preferredDistrict: string | null;
  preferredArea: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  moveInOn: string | null;
  lifestyle: RoommateLifestyle | null;
}
