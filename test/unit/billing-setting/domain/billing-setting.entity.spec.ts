import { BillingSettingEntity } from 'modules/billing-setting/domain/entities/billing-setting.entity';
import { BillingSettingScope } from 'modules/billing-setting/domain/enums/billing-setting-scope.enum';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('BillingSettingEntity', () => {
  it('applies defaults and records changes as domain events', () => {
    const setting = BillingSettingEntity.create({
      landlordId: generateUuid(),
      scope: BillingSettingScope.BUILDING,
      buildingId: generateUuid(),
      roomId: null,
    });

    expect(setting.paymentDueDay).toBe(5);
    expect(setting.remindDay).toBeNull();
    expect(setting.botEnabled).toBe(true);
    expect(setting.pullDomainEvents().map((event) => event.eventType)).toEqual([
      'billing_setting.created',
    ]);

    setting.update({ paymentDueDay: 10, remindDay: 3, botEnabled: false });

    expect(setting.paymentDueDay).toBe(10);
    expect(setting.remindDay).toBe(3);
    expect(setting.botEnabled).toBe(false);
    expect(setting.pullDomainEvents().map((event) => event.eventType)).toEqual([
      'billing_setting.updated',
    ]);
  });

  it('rejects invalid days, room scope without a room, and empty updates', () => {
    expect(() =>
      BillingSettingEntity.create({
        landlordId: generateUuid(),
        scope: BillingSettingScope.ROOM,
        buildingId: generateUuid(),
        roomId: null,
      }),
    ).toThrow(ValidationException);
    expect(() =>
      BillingSettingEntity.create({
        landlordId: generateUuid(),
        scope: BillingSettingScope.BUILDING,
        buildingId: generateUuid(),
        roomId: null,
        paymentDueDay: 29,
      }),
    ).toThrow(ValidationException);

    const setting = BillingSettingEntity.create({
      landlordId: generateUuid(),
      scope: BillingSettingScope.BUILDING,
      buildingId: generateUuid(),
      roomId: null,
    });
    expect(() => setting.update({})).toThrow(ValidationException);
  });
});
