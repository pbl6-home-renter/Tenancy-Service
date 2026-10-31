import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { BILLING_SETTING_DI_TOKEN } from '../../../billing-setting.di-token';
import { BillingSettingEntity } from '../../../domain/entities/billing-setting.entity';
import { BillingSettingNotFoundException } from '../../../domain/exceptions/billing-setting-not-found.exception';
import { BillingSettingNotOwnedException } from '../../../domain/exceptions/billing-setting-not-owned.exception';
import { BillingSettingRepository } from '../../../domain/repositories/billing-setting.repository';
import { BillingSettingUpdateCommand } from './billing-setting-update.command';

@CommandHandler(BillingSettingUpdateCommand)
export class BillingSettingUpdateCommandHandler implements ICommandHandler<
  BillingSettingUpdateCommand,
  BillingSettingEntity
> {
  constructor(
    @Inject(BILLING_SETTING_DI_TOKEN.REPOSITORY)
    private readonly settings: BillingSettingRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  execute(command: BillingSettingUpdateCommand): Promise<BillingSettingEntity> {
    return this.unitOfWork.run(async (context) => {
      const setting = await this.settings.findByIdForUpdate(
        command.settingId,
        context,
      );
      if (!setting)
        throw new BillingSettingNotFoundException(command.settingId);
      if (setting.landlordId !== command.landlordId) {
        throw new BillingSettingNotOwnedException(command.settingId);
      }
      setting.update({
        paymentDueDay: command.paymentDueDay,
        remindDay: command.remindDay,
        botEnabled: command.botEnabled,
        isActive: command.isActive,
      });
      await this.settings.save(setting, context);
      await this.outbox.append(
        setting
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return setting;
    });
  }
}
