import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BUILDING_DI_TOKEN } from 'modules/building/building.di-token';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { BuildingNotFoundException } from 'modules/building/domain/exceptions/building-not-found.exception';
import { BuildingNotOwnedException } from 'modules/building/domain/exceptions/building-not-owned.exception';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { RoomNotFoundException } from 'modules/room/domain/exceptions/room-not-found.exception';
import { RoomNotOwnedException } from 'modules/room/domain/exceptions/room-not-owned.exception';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { BILLING_SETTING_DI_TOKEN } from '../../../billing-setting.di-token';
import { BillingSettingEntity } from '../../../domain/entities/billing-setting.entity';
import { BillingSettingScope } from '../../../domain/enums/billing-setting-scope.enum';
import { ActiveSettingExistsException } from '../../../domain/exceptions/active-setting-exists.exception';
import { BillingSettingRepository } from '../../../domain/repositories/billing-setting.repository';
import { BillingSettingCreateCommand } from './billing-setting-create.command';

@CommandHandler(BillingSettingCreateCommand)
export class BillingSettingCreateCommandHandler implements ICommandHandler<
  BillingSettingCreateCommand,
  BillingSettingEntity
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildings: BuildingRepository,
    @Inject(ROOM_DI_TOKEN.REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(BILLING_SETTING_DI_TOKEN.REPOSITORY)
    private readonly settings: BillingSettingRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN) private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outbox: OutboxRepository,
  ) {}

  async execute(
    command: BillingSettingCreateCommand,
  ): Promise<BillingSettingEntity> {
    return this.unitOfWork.run(async (context) => {
      let buildingId: Uuid;
      let roomId: Uuid | null = null;
      if (command.scope === BillingSettingScope.BUILDING) {
        if (!command.buildingId || command.roomId) {
          throw new ValidationException(
            'For building scope, provide buildingId and omit roomId',
          );
        }
        const building = await this.buildings.findByIdForUpdate(
          command.buildingId,
          context,
        );
        if (!building) throw new BuildingNotFoundException(command.buildingId);
        if (building.landlordId !== command.landlordId) {
          throw new BuildingNotOwnedException(
            command.buildingId,
            command.landlordId,
          );
        }
        buildingId = building.id;
        if (await this.settings.findByBuilding(buildingId, context))
          throw new ActiveSettingExistsException();
      } else {
        if (!command.roomId || command.buildingId) {
          throw new ValidationException(
            'For room scope, provide roomId and omit buildingId',
          );
        }
        const room = await this.rooms.findByIdForUpdate(
          command.roomId,
          context,
        );
        if (!room) throw new RoomNotFoundException(command.roomId);
        if (room.landlordId !== command.landlordId) {
          throw new RoomNotOwnedException(command.roomId, command.landlordId);
        }
        buildingId = room.buildingId;
        roomId = room.id;
        if (await this.settings.findByRoom(roomId, context))
          throw new ActiveSettingExistsException();
      }

      const setting = BillingSettingEntity.create({
        landlordId: command.landlordId,
        scope: command.scope,
        buildingId,
        roomId,
        paymentDueDay: command.paymentDueDay,
        remindDay: command.remindDay,
        botEnabled: command.botEnabled,
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
