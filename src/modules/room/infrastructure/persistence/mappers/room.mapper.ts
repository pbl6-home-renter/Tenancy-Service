import { Room } from '../../../domain/entities/room.entity';
import { RoomTypeormEntity } from '../room.typeorm-entity';

export class RoomMapper {
  static toDomain(raw: RoomTypeormEntity): Room {
    return Room.reconstitute({
      id: raw.id,
      landlordId: raw.landlordId,
      buildingId: raw.buildingId,
      floorNumber: raw.floorNumber,
      name: raw.name,
      description: raw.description,
      area: raw.area,
      amenities: raw.amenities,
      maxOccupancy: raw.maxOccupancy,
      genderPolicy: raw.genderPolicy,
      rentPrice: raw.rentPrice,
      depositAmount: raw.depositAmount,
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(room: Room): RoomTypeormEntity {
    const raw = new RoomTypeormEntity();
    raw.id = room.id;
    raw.landlordId = room.landlordId;
    raw.buildingId = room.buildingId;
    raw.floorNumber = room.floorNumber;
    raw.name = room.name;
    raw.description = room.description;
    raw.area = room.area;
    raw.amenities = room.amenities;
    raw.maxOccupancy = room.maxOccupancy;
    raw.genderPolicy = room.genderPolicy;
    raw.rentPrice = room.rentPrice;
    raw.depositAmount = room.depositAmount.value;
    raw.status = room.status;
    raw.createdAt = room.createdAt;
    raw.updatedAt = room.updatedAt;
    raw.isDeleted = room.isDeleted;
    return raw;
  }
}
