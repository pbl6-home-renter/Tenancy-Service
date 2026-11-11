import { ContractActivateCommand } from 'modules/contract/application/commands/contract-activate/contract-activate.command';
import { ContractActivateCommandHandler } from 'modules/contract/application/commands/contract-activate/contract-activate.command.handler';
import { MediaLookupPort } from 'modules/contract/application/ports/media-lookup.port';
import { ContractEntity } from 'modules/contract/domain/entities/contract.entity';
import { ContractMember } from 'modules/contract/domain/entities/contract-member.entity';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { SignedFileMissingException } from 'modules/contract/domain/exceptions/signed-file-missing.exception';
import { Room } from 'modules/room/domain/entities/room.entity';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function createContract(landlordId: ReturnType<typeof generateUuid>) {
  return ContractEntity.create({
    landlordId,
    roomId: generateUuid(),
    tenantId: generateUuid(),
    tenantName: 'Tenant One',
    tenantPhone: '0912345678',
    depositAmount: 5_000_000,
    rentPrice: 3_000_000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    vehicleCount: 1,
  });
}

function createRoom(landlordId: ReturnType<typeof generateUuid>) {
  return Room.create({
    landlordId,
    buildingId: generateUuid(),
    name: 'Room 101',
    rentPrice: 3_000_000,
    depositAmount: 0,
  });
}

describe('ContractActivateCommandHandler', () => {
  it('activates the contract, occupies its room, and appends all events in one transaction', async () => {
    const landlordId = generateUuid();
    const contract = createContract(landlordId);
    const room = createRoom(landlordId);
    const context: TransactionContext = { kind: 'transaction' };
    const mediaId = generateUuid();
    const mediaLookup: MediaLookupPort = {
      findMedia: jest.fn(async () => null),
      findMediaByIds: jest.fn(async () => [
        {
          id: mediaId,
          ownerType: 'contract',
          ownerId: contract.id,
          purpose: 'contract_signed',
          status: 'uploaded',
        },
      ]),
    };
    const memberRepository = {
      save: jest.fn(
        async (_member: ContractMember, passedContext: TransactionContext) => {
          expect(passedContext).toBe(context);
        },
      ),
    } as unknown as ContractMemberRepository;
    const contractRepository = {
      findByIdForUpdate: jest.fn(
        async (_id: string, passedContext: TransactionContext) => {
          expect(passedContext).toBe(context);
          return contract;
        },
      ),
      save: jest.fn(
        async (_entity: ContractEntity, passedContext: TransactionContext) => {
          expect(passedContext).toBe(context);
        },
      ),
    } as unknown as ContractRepository;
    const roomRepository = {
      findByIdForUpdate: jest.fn(
        async (_id: string, passedContext: TransactionContext) => {
          expect(passedContext).toBe(context);
          return room;
        },
      ),
      save: jest.fn(
        async (_entity: Room, passedContext: TransactionContext) => {
          expect(passedContext).toBe(context);
        },
      ),
    } as unknown as RoomRepository;
    const outboxRepository = {
      append: jest.fn(async () => undefined),
    } as unknown as OutboxRepository;
    const unitOfWork: IUnitOfWork = {
      run: jest.fn(async (work) => work(context)),
    };
    const handler = new ContractActivateCommandHandler(
      memberRepository,
      contractRepository,
      roomRepository,
      unitOfWork,
      outboxRepository,
      mediaLookup,
    );

    const result = await handler.execute(
      new ContractActivateCommand(contract.id, landlordId, [mediaId]),
    );

    expect(result).toBe(contract);
    expect(contract.status).toBe('active');
    expect(contract.signedContractMediaIds).toEqual([mediaId]);
    expect(room.status).toBe('occupied');
    expect(memberRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        contractId: contract.id,
        tenantId: contract.tenantId,
      }),
      context,
    );
    expect(outboxRepository.append).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'contract.activated' }),
        expect.objectContaining({ eventType: 'room.status_changed' }),
        expect.objectContaining({ eventType: 'contract_member.added' }),
      ]),
      context,
    );
  });

  it('rejects media outside the contract ownership boundary before opening a transaction', async () => {
    const landlordId = generateUuid();
    const contract = createContract(landlordId);
    const mediaId = generateUuid();
    const mediaLookup: MediaLookupPort = {
      findMedia: jest.fn(async () => null),
      findMediaByIds: jest.fn(async () => [
        {
          id: mediaId,
          ownerType: 'contract',
          ownerId: generateUuid(),
          purpose: 'contract_signed',
          status: 'uploaded',
        },
      ]),
    };
    const unitOfWork: IUnitOfWork = { run: jest.fn() };
    const handler = new ContractActivateCommandHandler(
      {} as ContractMemberRepository,
      {} as ContractRepository,
      {} as RoomRepository,
      unitOfWork,
      {} as OutboxRepository,
      mediaLookup,
    );

    await expect(
      handler.execute(
        new ContractActivateCommand(contract.id, landlordId, [mediaId]),
      ),
    ).rejects.toThrow(SignedFileMissingException);
    expect(unitOfWork.run).not.toHaveBeenCalled();
  });
});
