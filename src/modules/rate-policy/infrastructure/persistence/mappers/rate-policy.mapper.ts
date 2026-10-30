import { RatePolicyEntity } from '../../../domain/entities/rate-policy.entity';
import { BillingUnit } from '../../../domain/enums/billing-unit.enum';
import { RateKind } from '../../../domain/enums/rate-kind.enum';
import { RateType } from '../../../domain/enums/rate-type.enum';
import { RateItem } from '../../../domain/value-objects/rate-item.vo';
import {
  RatePolicyTypeormEntity,
  StoredRateItem,
} from '../rate-policy.typeorm-entity';

export class RatePolicyMapper {
  static toDomain(raw: RatePolicyTypeormEntity): RatePolicyEntity {
    return RatePolicyEntity.reconstitute({
      id: raw.id,
      landlordId: raw.landlordId,
      scope: raw.scope,
      buildingId: raw.buildingId,
      roomId: raw.roomId,
      rates: raw.rates.map((item) =>
        RateItem.reconstitute({
          type: item.type as RateType,
          name: item.name,
          rateKind: item.rate_kind as RateKind,
          unitPrice: item.unit_price,
          steps: item.steps,
          billingUnit: item.billing_unit as BillingUnit,
        }),
      ),
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(policy: RatePolicyEntity): RatePolicyTypeormEntity {
    const raw = new RatePolicyTypeormEntity();
    raw.id = policy.id;
    raw.landlordId = policy.landlordId;
    raw.scope = policy.scope;
    raw.buildingId = policy.buildingId;
    raw.roomId = policy.roomId;
    raw.rates = policy.rates.map((rate): StoredRateItem => {
      const item = rate.toProps();
      return {
        type: item.type,
        name: item.name,
        rate_kind: item.rateKind,
        unit_price: item.unitPrice,
        steps: item.steps,
        billing_unit: item.billingUnit,
      };
    });
    raw.isActive = policy.isActive;
    raw.createdAt = policy.createdAt;
    raw.updatedAt = policy.updatedAt;
    raw.isDeleted = policy.isDeleted;
    return raw;
  }
}
