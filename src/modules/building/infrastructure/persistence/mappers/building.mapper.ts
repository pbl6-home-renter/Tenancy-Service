import { BuildingEntity } from '../../../domain/entities/building.entity';
import { BuildingTypeormEntity } from '../building.typeorm-entity';

export class BuildingMapper {
  static toDomain(raw: BuildingTypeormEntity): BuildingEntity {
    return BuildingEntity.reconstitute({
      id: raw.id,
      landlordId: raw.landlordId,
      name: raw.name,
      province: raw.province,
      ward: raw.ward,
      address: raw.address,
      latitude: Number(raw.latitude),
      longitude: Number(raw.longitude),
      status: raw.status,
      reviewedBy: raw.reviewedBy,
      reviewedAt: raw.reviewedAt,
      note: raw.note,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(building: BuildingEntity): BuildingTypeormEntity {
    const raw = new BuildingTypeormEntity();
    raw.id = building.id;
    raw.landlordId = building.landlordId;
    raw.name = building.name;
    raw.province = building.province;
    raw.ward = building.ward;
    raw.address = building.address;
    raw.latitude = String(building.latitude.value);
    raw.longitude = String(building.longitude.value);
    raw.status = building.status;
    raw.reviewedBy = building.reviewedBy;
    raw.reviewedAt = building.reviewedAt;
    raw.note = building.note;
    raw.createdAt = building.createdAt;
    raw.updatedAt = building.updatedAt;
    raw.isDeleted = building.isDeleted;
    return raw;
  }
}
