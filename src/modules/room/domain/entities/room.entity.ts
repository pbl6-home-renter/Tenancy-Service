import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import {
  Uuid,
  generateUuid,
  isValidUuid,
} from 'shared/domain/value-objects/uuid.vo';
import { InvalidRoomException } from '../exceptions/invalid-room.exception';
import { GenderPolicy } from '../enums/gender-policy.enum';
import { RoomStatus } from '../enums/room-status.enum';
import { RoomCreatedEvent } from '../events/room-created.event';
import { RoomDeletedEvent } from '../events/room-deleted.event';
import { RoomStatusChangedEvent } from '../events/room-status-changed.event';
import { RoomUpdatedEvent } from '../events/room-updated.event';
import {
  CreateRoomProps,
  RoomFields,
  RoomProps,
  UpdateRoomProps,
} from './room.props';
import {
  isRoomAmenityKey,
  RoomAmenities,
} from '../value-objects/room-amenities.vo';
import { InvalidRoomTransitionException } from '../exceptions/invalid-room-transition.exception';
import { DepositAmount } from '../value-objects/deposit-amount.vo';

export class Room extends AggregateRoot {
  private _floorNumber: number | null;
  private _name: string;
  private _description: string | null;
  private _area: number | null;
  private _amenities: RoomAmenities;
  private _maxOccupancy: number | null;
  private _genderPolicy: GenderPolicy;
  private _rentPrice: number;
  private readonly _depositAmount: DepositAmount;
  private _status: RoomStatus;

  private constructor(
    id: Uuid,
    private readonly _landlordId: Uuid,
    private readonly _buildingId: Uuid,
    floorNumber: number | null,
    name: string,
    description: string | null,
    area: number | null,
    amenities: RoomAmenities,
    maxOccupancy: number | null,
    genderPolicy: GenderPolicy,
    rentPrice: number,
    depositAmount: DepositAmount,
    status: RoomStatus,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
    this._floorNumber = floorNumber;
    this._name = name;
    this._description = description;
    this._area = area;
    this._amenities = cloneAmenities(amenities);
    this._maxOccupancy = maxOccupancy;
    this._genderPolicy = genderPolicy;
    this._rentPrice = rentPrice;
    this._depositAmount = depositAmount;
    this._status = status;
  }

  static create(props: CreateRoomProps): Room {
    const now = new Date();
    const room = new Room(
      props.id ?? generateUuid(),
      props.landlordId,
      props.buildingId,
      props.floorNumber ?? null,
      props.name,
      props.description ?? null,
      props.area ?? null,
      props.amenities === undefined ? {} : props.amenities,
      props.maxOccupancy ?? null,
      props.genderPolicy ?? GenderPolicy.ANY,
      props.rentPrice,
      DepositAmount.create(props.depositAmount),
      RoomStatus.AVAILABLE,
      props.createdAt ?? now,
      props.updatedAt ?? now,
      false,
    );
    room.assertValid();
    room.addDomainEvent(new RoomCreatedEvent(room.id, room.currentFields()));
    return room;
  }

  static reconstitute(props: RoomProps): Room {
    const room = new Room(
      props.id,
      props.landlordId,
      props.buildingId,
      props.floorNumber,
      props.name,
      props.description,
      props.area,
      props.amenities,
      props.maxOccupancy,
      props.genderPolicy,
      props.rentPrice,
      DepositAmount.create(props.depositAmount),
      props.status,
      props.createdAt,
      props.updatedAt,
      props.isDeleted,
    );
    room.assertValid();
    return room;
  }

  get landlordId(): Uuid {
    return this._landlordId;
  }

  get buildingId(): Uuid {
    return this._buildingId;
  }

  get floorNumber(): number | null {
    return this._floorNumber;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | null {
    return this._description;
  }

  get area(): number | null {
    return this._area;
  }

  get amenities(): RoomAmenities {
    return cloneAmenities(this._amenities);
  }

  get maxOccupancy(): number | null {
    return this._maxOccupancy;
  }

  get genderPolicy(): GenderPolicy {
    return this._genderPolicy;
  }

  get rentPrice(): number {
    return this._rentPrice;
  }

  get depositAmount(): DepositAmount {
    return this._depositAmount;
  }

  get status(): RoomStatus {
    return this._status;
  }

  update(props: UpdateRoomProps): void {
    this.assertNotDeleted();

    const next: RoomFields = {
      ...this.currentFields(),
      ...props,
      amenities:
        props.amenities === undefined
          ? this.amenities
          : cloneAmenities(props.amenities),
    };
    Room.assertValidFields(next);

    this._floorNumber = next.floorNumber;
    this._name = next.name;
    this._description = next.description;
    this._area = next.area;
    this._amenities = cloneAmenities(next.amenities);
    this._maxOccupancy = next.maxOccupancy;
    this._genderPolicy = next.genderPolicy;
    this._rentPrice = next.rentPrice;
    this.touch();

    this.addDomainEvent(
      new RoomUpdatedEvent(this.id, this.currentFields(), this._status),
    );
  }

  delete(): void {
    if (this.isDeleted) return;

    this.markAsDeleted();
    this.touch();
    this.addDomainEvent(new RoomDeletedEvent(this.id));
  }

  changeStatus(status: RoomStatus): void {
    this.assertNotDeleted();
    if (!Object.values(RoomStatus).includes(status)) {
      throw new InvalidRoomException(`Unsupported room status "${status}"`);
    }
    if (status === RoomStatus.OCCUPIED) {
      throw new InvalidRoomException(
        'Room status "occupied" is derived from an active contract',
      );
    }
    if (this._status === status) return;

    const previousStatus = this._status;
    this._status = status;
    this.touch();
    this.addDomainEvent(
      new RoomStatusChangedEvent(this.id, previousStatus, status),
    );
  }

  markReady(): void {
    this.assertNotDeleted();
    if (this._status !== RoomStatus.MAINTENANCE) {
      throw new InvalidRoomTransitionException(
        this._status,
        RoomStatus.AVAILABLE,
      );
    }

    this.changeStatus(RoomStatus.AVAILABLE);
  }

  private assertValid(): void {
    if (!isValidUuid(this.id)) {
      throw new InvalidRoomException('id must be a valid UUID');
    }
    if (!isValidUuid(this._landlordId)) {
      throw new InvalidRoomException('landlordId must be a valid UUID');
    }
    if (!isValidUuid(this._buildingId)) {
      throw new InvalidRoomException('buildingId must be a valid UUID');
    }
    if (!Object.values(RoomStatus).includes(this._status)) {
      throw new InvalidRoomException(
        `Unsupported room status "${this._status}"`,
      );
    }
    if (
      !(this.createdAt instanceof Date) ||
      Number.isNaN(this.createdAt.getTime()) ||
      !(this.updatedAt instanceof Date) ||
      Number.isNaN(this.updatedAt.getTime())
    ) {
      throw new InvalidRoomException(
        'createdAt and updatedAt must be valid dates',
      );
    }
    Room.assertValidFields(this.currentFields());
  }

  private static assertValidFields(fields: RoomFields): void {
    if (
      typeof fields.name !== 'string' ||
      [...fields.name].length < 1 ||
      [...fields.name].length > 254
    ) {
      throw new InvalidRoomException(
        'name must contain between 1 and 254 characters',
      );
    }
    if (
      fields.description !== null &&
      (typeof fields.description !== 'string' ||
        [...fields.description].length < 1 ||
        [...fields.description].length > 500)
    ) {
      throw new InvalidRoomException(
        'description must be null or contain between 1 and 500 characters',
      );
    }
    if (
      fields.floorNumber !== null &&
      (!Number.isInteger(fields.floorNumber) || fields.floorNumber <= 0)
    ) {
      throw new InvalidRoomException('floorNumber must be a positive integer');
    }
    if (
      fields.area !== null &&
      (!Number.isFinite(fields.area) || fields.area <= 0)
    ) {
      throw new InvalidRoomException('area must be a positive number');
    }
    if (
      fields.maxOccupancy !== null &&
      (!Number.isInteger(fields.maxOccupancy) || fields.maxOccupancy <= 0)
    ) {
      throw new InvalidRoomException('maxOccupancy must be a positive integer');
    }
    if (!Number.isFinite(fields.rentPrice) || fields.rentPrice < 0) {
      throw new InvalidRoomException('rentPrice must be a non-negative number');
    }
    DepositAmount.create(fields.depositAmount);
    if (!isPlainObject(fields.amenities)) {
      throw new InvalidRoomException('amenities must be an object');
    }
    if (!Object.values(GenderPolicy).includes(fields.genderPolicy)) {
      throw new InvalidRoomException(
        `Unsupported gender policy "${fields.genderPolicy}"`,
      );
    }
  }

  private assertNotDeleted(): void {
    if (this.isDeleted) {
      throw new InvalidRoomException('A deleted room cannot be changed');
    }
  }

  private touch(): void {
    this.updatedAt.setTime(Date.now());
  }

  private currentFields(): RoomFields {
    return {
      landlordId: this._landlordId,
      buildingId: this._buildingId,
      floorNumber: this._floorNumber,
      name: this._name,
      description: this._description,
      area: this._area,
      amenities: this.amenities,
      maxOccupancy: this._maxOccupancy,
      genderPolicy: this._genderPolicy,
      rentPrice: this._rentPrice,
      depositAmount: this._depositAmount.value,
    };
  }
}

function cloneAmenities(value: unknown): RoomAmenities {
  if (!isPlainObject(value)) {
    throw new InvalidRoomException('amenities must be an object');
  }

  const amenities: RoomAmenities = {};
  for (const [key, amenity] of Object.entries(value)) {
    if (!isRoomAmenityKey(key)) {
      throw new InvalidRoomException(`Unsupported room amenity "${key}"`);
    }
    if (typeof amenity !== 'boolean') {
      throw new InvalidRoomException(`Room amenity "${key}" must be a boolean`);
    }
    amenities[key] = amenity;
  }
  return amenities;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
