import { BuildingEntity } from 'modules/building/domain/entities/building.entity';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { ApprovedBuildingLockedException } from 'modules/building/domain/exceptions/approved-building-locked.exception';
import { BuildingNoteRequiredException } from 'modules/building/domain/exceptions/building-note-required.exception';
import { Latitude } from 'modules/building/domain/value-objects/latitude.vo';
import { Longitude } from 'modules/building/domain/value-objects/longitude.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('Latitude and Longitude', () => {
  it('enforce geographic coordinate boundaries', () => {
    expect(Latitude.create(90).value).toBe(90);
    expect(Longitude.create(-180).value).toBe(-180);
    expect(() => Latitude.create(90.1)).toThrow(ValidationException);
    expect(() => Longitude.create(Number.NaN)).toThrow(ValidationException);
  });
});

describe('BuildingEntity', () => {
  it('approves a pending building and locks its approved profile', () => {
    const building = BuildingEntity.create({
      landlordId: generateUuid(),
      name: 'Riverside',
      province: 'Da Nang',
      ward: 'Hai Chau',
      address: '1 River Road',
      latitude: 16.0678,
      longitude: 108.2208,
    });
    const reviewerId = generateUuid();

    building.approve(reviewerId);

    expect(building.status).toBe(BuildingStatus.APPROVED);
    expect(building.reviewedBy).toBe(reviewerId);
    expect(building.pullDomainEvents().map((event) => event.eventType)).toEqual(
      ['building.created', 'building.approved'],
    );
    expect(() => building.update({ name: 'Changed' })).toThrow(
      ApprovedBuildingLockedException,
    );
  });

  it('requires a rejection note', () => {
    const building = BuildingEntity.create({
      landlordId: generateUuid(),
      name: 'Riverside',
      province: 'Da Nang',
      ward: 'Hai Chau',
      address: '1 River Road',
      latitude: 16.0678,
      longitude: 108.2208,
    });

    expect(() => building.reject(generateUuid(), '')).toThrow(
      BuildingNoteRequiredException,
    );
    expect(building.status).toBe(BuildingStatus.PENDING);
  });
});
