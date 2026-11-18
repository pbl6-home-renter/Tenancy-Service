import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { RoomNotFoundException } from 'modules/room/domain/exceptions/room-not-found.exception';
import { RoomNotOwnedException } from 'modules/room/domain/exceptions/room-not-owned.exception';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ActiveContractExistsException } from '../../../domain/exceptions/active-contract-exists.exception';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { ContractCreateCommand } from './contract-create.command';
import { TenantUserProjectionPort } from '../../ports/tenant-user-projection.port';
import { TenantPhone } from '../../../domain/value-objects/tenant-phone.vo';

@CommandHandler(ContractCreateCommand)
export class ContractCreateCommandHandler implements ICommandHandler<
  ContractCreateCommand,
  ContractEntity
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contractRepository: ContractRepository,
    @Inject(ROOM_DI_TOKEN.REPOSITORY)
    private readonly roomRepository: RoomRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
    @Inject(CONTRACT_DI_TOKEN.TENANT_USER_PROJECTION)
    private readonly tenantUsers: TenantUserProjectionPort,
  ) {}

  execute(command: ContractCreateCommand): Promise<ContractEntity> {
    return this.unitOfWork.run(async (context) => {
      const phone =
        command.tenantPhone === null
          ? null
          : TenantPhone.create(command.tenantPhone);
      // Use the same lock order as Identity reconciliation: phone before room/contract.
      if (command.tenantId === null && phone !== null) {
        await this.tenantUsers.lockPhone(phone, context);
      }
      const room = await this.roomRepository.findByIdForUpdate(
        command.roomId,
        context,
      );
      if (!room) {
        throw new RoomNotFoundException(command.roomId);
      }
      if (room.landlordId !== command.landlordId) {
        throw new RoomNotOwnedException(command.roomId, command.landlordId);
      }
      if (await this.contractRepository.existsActiveByRoom(room.id, context)) {
        throw new ActiveContractExistsException(room.id);
      }

      const contract = ContractEntity.create({
        landlordId: command.landlordId,
        roomId: command.roomId,
        tenantId:
          command.tenantId ??
          (phone === null
            ? null
            : await this.tenantUsers.findTenantIdByPhone(phone, context)),
        tenantName: command.tenantName,
        tenantPhone: command.tenantPhone,
        depositAmount: command.depositAmount,
        rentPrice: command.rentPrice,
        startDate: command.startDate,
        endDate: command.endDate,
        vehicleCount: command.vehicleCount,
      });
      await this.contractRepository.save(contract, context);
      await this.outboxRepository.append(
        contract
          .pullDomainEvents()
          .map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return contract;
    });
  }
}
