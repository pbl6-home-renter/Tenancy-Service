import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OUTBOX_DI_TOKEN } from 'modules/outbox/outbox.di-token';
import { RoomNotFoundException } from 'modules/room/domain/exceptions/room-not-found.exception';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { UNIT_OF_WORK_DI_TOKEN } from 'shared/application/di-tokens';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { CONTRACT_DI_TOKEN } from '../../../contract.di-token';
import { ContractMember } from '../../../domain/entities/contract-member.entity';
import { ContractMemberRepository } from '../../../domain/repositories/contract-member.repository';
import { ContractEntity } from '../../../domain/entities/contract.entity';
import { ContractForbiddenException } from '../../../domain/exceptions/contract-forbidden.exception';
import { ContractNotFoundException } from '../../../domain/exceptions/contract-not-found.exception';
import { SignedFileMissingException } from '../../../domain/exceptions/signed-file-missing.exception';
import { ContractRepository } from '../../../domain/repositories/contract.repository';
import { MediaLookupPort } from '../../ports/media-lookup.port';
import { ContractActivateCommand } from './contract-activate.command';

@CommandHandler(ContractActivateCommand)
export class ContractActivateCommandHandler implements ICommandHandler<
  ContractActivateCommand,
  ContractEntity
> {
  constructor(
    @Inject(CONTRACT_DI_TOKEN.MEMBER_REPOSITORY)
    private readonly memberRepository: ContractMemberRepository,
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contractRepository: ContractRepository,
    @Inject(ROOM_DI_TOKEN.REPOSITORY)
    private readonly roomRepository: RoomRepository,
    @Inject(UNIT_OF_WORK_DI_TOKEN)
    private readonly unitOfWork: IUnitOfWork,
    @Inject(OUTBOX_DI_TOKEN.REPOSITORY)
    private readonly outboxRepository: OutboxRepository,
    @Inject(CONTRACT_DI_TOKEN.MEDIA_LOOKUP)
    private readonly mediaLookup: MediaLookupPort,
  ) {}

  async execute(command: ContractActivateCommand): Promise<ContractEntity> {
    const media = await this.mediaLookup.findMediaByIds(
      command.signedContractMediaIds,
    );
    const validIds = new Set(
      media
        .filter(
          (item) =>
            item.ownerType === 'contract' &&
            item.ownerId === command.contractId &&
            item.purpose === 'contract_signed' &&
            item.status === 'uploaded',
        )
        .map((item) => item.id),
    );
    if (
      command.signedContractMediaIds.length === 0 ||
      validIds.size !== new Set(command.signedContractMediaIds).size
    ) {
      throw new SignedFileMissingException();
    }

    return this.unitOfWork.run(async (context) => {
      const contract = await this.contractRepository.findByIdForUpdate(
        command.contractId,
        context,
      );
      if (!contract) throw new ContractNotFoundException(command.contractId);
      if (contract.landlordId !== command.landlordId) {
        throw new ContractForbiddenException();
      }

      const room = await this.roomRepository.findByIdForUpdate(
        contract.roomId,
        context,
      );
      if (!room) throw new RoomNotFoundException(contract.roomId);

      const activatedAt = new Date();
      contract.activate([...command.signedContractMediaIds], activatedAt);
      room.occupyByContract();
      const representative = ContractMember.add({
        contractId: contract.id,
        tenantId: contract.tenantId,
        tenantName: contract.tenantName,
        tenantPhone: contract.tenantPhone,
        joinedAt: new Date(contract.startDate),
      });
      await this.memberRepository.save(representative, context);

      await this.contractRepository.save(contract, context);
      await this.roomRepository.save(room, context);
      await this.outboxRepository.append(
        [
          ...contract.pullDomainEvents(),
          ...representative.pullDomainEvents(),
          ...room.pullDomainEvents(),
        ].map((event) => OutboxMessage.fromDomainEvent(event)),
        context,
      );
      return contract;
    });
  }
}
