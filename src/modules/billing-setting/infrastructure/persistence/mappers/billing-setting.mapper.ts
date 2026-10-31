import { BillingSettingEntity } from '../../../domain/entities/billing-setting.entity';
import { BillingSettingTypeormEntity } from '../billing-setting.typeorm-entity';

export class BillingSettingMapper {
  static toDomain(raw: BillingSettingTypeormEntity): BillingSettingEntity {
    return BillingSettingEntity.reconstitute({
      id: raw.id,
      landlordId: raw.landlordId,
      scope: raw.scope,
      buildingId: raw.buildingId,
      roomId: raw.roomId,
      paymentDueDay: raw.paymentDueDay,
      remindDay: raw.remindDay,
      botEnabled: raw.botEnabled,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(
    setting: BillingSettingEntity,
  ): BillingSettingTypeormEntity {
    const raw = new BillingSettingTypeormEntity();
    raw.id = setting.id;
    raw.landlordId = setting.landlordId;
    raw.scope = setting.scope;
    raw.buildingId = setting.buildingId;
    raw.roomId = setting.roomId;
    raw.paymentDueDay = setting.paymentDueDay;
    raw.remindDay = setting.remindDay;
    raw.botEnabled = setting.botEnabled;
    raw.isActive = setting.isActive;
    raw.createdAt = setting.createdAt;
    raw.updatedAt = setting.updatedAt;
    raw.isDeleted = setting.isDeleted;
    return raw;
  }
}
