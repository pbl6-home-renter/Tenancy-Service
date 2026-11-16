import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { RoommateLifestyle } from '../roommate-profile.types';

export interface RoommateProfileDetailsInput {
  isVisible: boolean;
  bio?: string | null;
  gender?: string | null;
  birthYear?: number | null;
  occupation?: string | null;
  preferredProvince?: string | null;
  preferredDistrict?: string | null;
  preferredArea?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  moveInOn?: string | null;
  lifestyle?: RoommateLifestyle | null;
}

/** Validated, normalized values for a complete PUT replacement. */
export class RoommateProfileDetails {
  private static readonly MAX_BUDGET = 999_999_999_999_999;

  private constructor(readonly value: Required<RoommateProfileDetailsInput>) {}

  static create(input: RoommateProfileDetailsInput): RoommateProfileDetails {
    if (typeof input.isVisible !== 'boolean') {
      throw new ValidationException('isVisible is required');
    }
    const bio = input.bio?.trim() || null;
    if (input.isVisible && !bio) {
      throw new ValidationException('Visible profiles require a nonempty bio');
    }
    if (
      input.budgetMin != null &&
      input.budgetMax != null &&
      input.budgetMin > input.budgetMax
    ) {
      throw new ValidationException('budgetMin cannot exceed budgetMax');
    }
    for (const budget of [input.budgetMin, input.budgetMax]) {
      if (
        budget != null &&
        (!Number.isSafeInteger(budget) ||
          budget < 0 ||
          budget > RoommateProfileDetails.MAX_BUDGET)
      ) {
        throw new ValidationException('Budget must be a nonnegative integer');
      }
    }
    if (input.moveInOn) {
      const date = new Date(`${input.moveInOn}T00:00:00.000Z`);
      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== input.moveInOn
      ) {
        throw new ValidationException('moveInOn must be a calendar date');
      }
    }
    return new RoommateProfileDetails({
      isVisible: input.isVisible,
      bio,
      gender: input.gender ?? null,
      birthYear: input.birthYear ?? null,
      occupation: input.occupation?.trim() || null,
      preferredProvince: input.preferredProvince?.trim() || null,
      preferredDistrict: input.preferredDistrict?.trim() || null,
      preferredArea: input.preferredArea?.trim() || null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      moveInOn: input.moveInOn ?? null,
      lifestyle: input.lifestyle ?? null,
    });
  }
}
