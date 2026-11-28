import { parseLandlordLockSnapshot } from 'modules/landlord-lock/infrastructure/cli/backfill-landlord-locks';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

it('preserves Identity lock timestamps for initial backfill and rejects incomplete snapshots before writing', () => {
  const userId = generateUuid();
  expect(
    parseLandlordLockSnapshot([
      { userId, lockedAt: '2026-11-27T01:00:00.000Z' },
    ]),
  ).toEqual([{ userId, lockedAt: new Date('2026-11-27T01:00:00.000Z') }]);
  for (const input of [
    null,
    {},
    [null],
    [{ userId }],
    [{ userId, lockedAt: '2026-02-30T00:00:00.000Z' }],
    [{ userId: 'bad-id', lockedAt: '2026-11-27T01:00:00.000Z' }],
  ]) {
    expect(() => parseLandlordLockSnapshot(input)).toThrow();
  }
});
