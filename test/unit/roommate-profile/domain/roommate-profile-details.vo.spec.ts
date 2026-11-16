import { RoommateProfileDetails } from 'modules/roommate-profile/domain/value-objects/roommate-profile-details.vo';

describe('RoommateProfileDetails', () => {
  it('requires a bio only while visible and preserves saved opt-in', () => {
    expect(() =>
      RoommateProfileDetails.create({ isVisible: true, bio: '   ' }),
    ).toThrow('Visible profiles require a nonempty bio');
    expect(
      RoommateProfileDetails.create({ isVisible: false }).value,
    ).toMatchObject({ isVisible: false, bio: null });
    expect(
      RoommateProfileDetails.create({ isVisible: true, bio: '  Hi  ' }).value
        .bio,
    ).toBe('Hi');
  });

  it('rejects inverted budgets and impossible calendar dates', () => {
    expect(() =>
      RoommateProfileDetails.create({
        isVisible: false,
        budgetMin: 3,
        budgetMax: 2,
      }),
    ).toThrow('budgetMin cannot exceed budgetMax');
    expect(() =>
      RoommateProfileDetails.create({
        isVisible: false,
        moveInOn: '2026-02-30',
      }),
    ).toThrow('moveInOn must be a calendar date');
    expect(() =>
      RoommateProfileDetails.create({
        isVisible: false,
        budgetMax: 1_000_000_000_000_000,
      }),
    ).toThrow('Budget must be a nonnegative integer');
  });
});
