import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import {
  generateUuid,
  isValidUuid,
  Uuid,
} from 'shared/domain/value-objects/uuid.vo';
import { BuildingStatus } from '../enums/building-status.enum';
import { BuildingCreatedEvent } from '../events/building-created.event';
import { BuildingUpdatedEvent } from '../events/building-updated.event';
import { BuildingApprovedEvent } from '../events/building-approved.event';
import { BuildingRejectedEvent } from '../events/building-rejected.event';
import { BuildingDeletedEvent } from '../events/building-deleted.event';
import { ApprovedBuildingLockedException } from '../exceptions/approved-building-locked.exception';
import { BuildingNotFoundException } from '../exceptions/building-not-found.exception';
import { BuildingNoteRequiredException } from '../exceptions/building-note-required.exception';
import { InvalidBuildingStatusTransitionException } from '../exceptions/invalid-building-status-transition.exception';
import { Latitude } from '../value-objects/latitude.vo';
import { Longitude } from '../value-objects/longitude.vo';
import {
  BuildingProps,
  CreateBuildingProps,
  UpdateBuildingProps,
} from './building.props';

export class BuildingEntity extends AggregateRoot {
  private readonly _landlordId: Uuid;
  private _name: string;
  private _province: string;
  private _ward: string;
  private _address: string;
  private _latitude: Latitude;
  private _longitude: Longitude;
  private _status: BuildingStatus;
  private _reviewedBy: Uuid | null;
  private _reviewedAt: Date | null;
  private _note: string | null;

  private constructor(
    id: Uuid,
    landlordId: Uuid,
    name: string,
    province: string,
    ward: string,
    address: string,
    latitude: Latitude,
    longitude: Longitude,
    status: BuildingStatus,
    reviewedBy: Uuid | null,
    reviewedAt: Date | null,
    note: string | null,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean = false,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
    this._landlordId = landlordId;
    this._name = name;
    this._province = province;
    this._ward = ward;
    this._address = address;
    this._latitude = latitude;
    this._longitude = longitude;
    this._status = status;
    this._reviewedBy = reviewedBy;
    this._reviewedAt = reviewedAt;
    this._note = note;
  }

  static create(input: CreateBuildingProps): BuildingEntity {
    const now = new Date();
    const building = BuildingEntity.reconstitute({
      id: generateUuid(),
      landlordId: input.landlordId,
      name: input.name,
      province: input.province,
      ward: input.ward,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      status: BuildingStatus.PENDING,
      reviewedBy: null,
      reviewedAt: null,
      note: null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    });
    building.addDomainEvent(
      new BuildingCreatedEvent(
        building.id,
        building.landlordId,
        building.name,
        building.province,
        building.ward,
        building.address,
        building.latitude.value,
        building.longitude.value,
      ),
    );
    return building;
  }

  static reconstitute(props: BuildingProps): BuildingEntity {
    BuildingEntity.assertUuid('id', props.id);
    BuildingEntity.validateProperties(props);
    const latitude = Latitude.create(props.latitude);
    const longitude = Longitude.create(props.longitude);
    if (!Object.values(BuildingStatus).includes(props.status)) {
      throw new ValidationException('Invalid building status');
    }
    if (props.reviewedBy !== null) {
      BuildingEntity.assertUuid('reviewedBy', props.reviewedBy);
    }
    BuildingEntity.validateNote(props.note, props.status);

    return new BuildingEntity(
      props.id,
      props.landlordId,
      props.name,
      props.province,
      props.ward,
      props.address,
      latitude,
      longitude,
      props.status,
      props.reviewedBy,
      props.reviewedAt ? new Date(props.reviewedAt) : null,
      props.note,
      new Date(props.createdAt),
      new Date(props.updatedAt),
      props.isDeleted,
    );
  }

  get landlordId(): Uuid {
    return this._landlordId;
  }
  get name(): string {
    return this._name;
  }
  get province(): string {
    return this._province;
  }
  get ward(): string {
    return this._ward;
  }
  get address(): string {
    return this._address;
  }
  get latitude(): Latitude {
    return this._latitude;
  }
  get longitude(): Longitude {
    return this._longitude;
  }
  get status(): BuildingStatus {
    return this._status;
  }
  get reviewedBy(): Uuid | null {
    return this._reviewedBy;
  }
  get reviewedAt(): Date | null {
    return this._reviewedAt ? new Date(this._reviewedAt) : null;
  }
  get note(): string | null {
    return this._note;
  }

  update(input: UpdateBuildingProps): void {
    this.assertNotDeleted();
    if (this.status === BuildingStatus.APPROVED) {
      throw new ApprovedBuildingLockedException(this.id);
    }

    const next: CreateBuildingProps = {
      landlordId: this.landlordId,
      name: input.name === undefined ? this.name : input.name,
      province: input.province === undefined ? this.province : input.province,
      ward: input.ward === undefined ? this.ward : input.ward,
      address: input.address === undefined ? this.address : input.address,
      latitude:
        input.latitude === undefined ? this.latitude.value : input.latitude,
      longitude:
        input.longitude === undefined ? this.longitude.value : input.longitude,
    };
    BuildingEntity.validateProperties(next);
    const latitude = Latitude.create(next.latitude);
    const longitude = Longitude.create(next.longitude);
    this._name = next.name;
    this._province = next.province;
    this._ward = next.ward;
    this._address = next.address;
    this._latitude = latitude;
    this._longitude = longitude;
    this.touch();
    this.addDomainEvent(
      new BuildingUpdatedEvent(
        this.id,
        this.name,
        this.province,
        this.ward,
        this.address,
        this.latitude.value,
        this.longitude.value,
      ),
    );
  }

  approve(reviewedBy: Uuid, note?: string): void {
    const reviewedAt = this.review(
      BuildingStatus.APPROVED,
      reviewedBy,
      note ?? null,
    );
    this.addDomainEvent(
      new BuildingApprovedEvent(
        this.id,
        reviewedBy,
        reviewedAt.toISOString(),
        this.note,
      ),
    );
  }

  reject(reviewedBy: Uuid, note: string): void {
    const reviewedAt = this.review(BuildingStatus.REJECTED, reviewedBy, note);
    this.addDomainEvent(
      new BuildingRejectedEvent(
        this.id,
        reviewedBy,
        reviewedAt.toISOString(),
        note,
      ),
    );
  }

  delete(): void {
    if (this.isDeleted) return;
    super.markAsDeleted();
    this.touch();
    this.addDomainEvent(new BuildingDeletedEvent(this.id));
  }

  override markAsDeleted(): void {
    this.delete();
  }

  private review(
    status: BuildingStatus,
    reviewedBy: Uuid,
    note: string | null,
  ): Date {
    this.assertNotDeleted();
    if (this.status !== BuildingStatus.PENDING) {
      throw new InvalidBuildingStatusTransitionException(
        this.id,
        this.status,
        status,
      );
    }
    BuildingEntity.assertUuid('reviewedBy', reviewedBy);
    BuildingEntity.validateNote(note, status);
    const reviewedAt = new Date();
    this._status = status;
    this._reviewedBy = reviewedBy;
    this._reviewedAt = reviewedAt;
    this._note = note;
    this.touch();
    return reviewedAt;
  }

  private assertNotDeleted(): void {
    if (this.isDeleted) throw new BuildingNotFoundException(this.id);
  }

  private touch(): void {
    this.updatedAt.setTime(Date.now());
  }

  private static validateProperties(props: CreateBuildingProps): void {
    this.assertUuid('landlordId', props.landlordId);
    this.assertText('name', props.name, 254);
    this.assertText('province', props.province, 100);
    this.assertText('ward', props.ward, 100);
    this.assertText('address', props.address, 254);
  }

  private static validateNote(
    note: string | null,
    status: BuildingStatus,
  ): void {
    if (
      status === BuildingStatus.REJECTED &&
      (note == null || (typeof note === 'string' && note.trim().length === 0))
    ) {
      throw new BuildingNoteRequiredException();
    }
    if (note !== null) {
      this.assertText('note', note, 500);
    }
  }

  private static assertText(field: string, value: unknown, max: number): void {
    if (
      typeof value !== 'string' ||
      value.trim().length === 0 ||
      [...value].length > max
    ) {
      throw new ValidationException(
        `${field} must contain 1–${max} characters`,
      );
    }
  }

  private static assertUuid(field: string, value: Uuid): void {
    if (!isValidUuid(value))
      throw new ValidationException(`${field} must be a valid UUID`);
  }
}
