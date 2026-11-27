import { ContractActivateCommand } from 'modules/contract/application/commands/contract-activate/contract-activate.command';
import { ContractActivateCommandHandler } from 'modules/contract/application/commands/contract-activate/contract-activate.command.handler';
import { ContractMemberNotificationSnapshotService } from 'modules/contract/application/services/contract-member-notification-snapshot.service';
import { ContractNotificationCodeConstant } from 'modules/contract/domain/constants/contract-notification-code.constant';
import { ContractEntity } from 'modules/contract/domain/entities/contract.entity';
import { ContractMember } from 'modules/contract/domain/entities/contract-member.entity';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { SignedFileMissingException } from 'modules/contract/domain/exceptions/signed-file-missing.exception';
import { Room } from 'modules/room/domain/entities/room.entity';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  createLinkDependencies,
  createMember,
} from '../support/contract-link.fixture';

function setup(
  mode: 'explicit' | 'phone' | 'unmatched' | 'actor' = 'explicit',
) {
  const deps = createLinkDependencies();
  const landlordId = generateUuid();
  const contract = ContractEntity.create({
    landlordId,
    roomId: generateUuid(),
    tenantId:
      mode === 'actor'
        ? landlordId
        : mode === 'explicit'
          ? generateUuid()
          : null,
    tenantName: 'Tenant One',
    tenantPhone: '0912345678',
    depositAmount: 5_000_000,
    rentPrice: 3_000_000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    vehicleCount: 1,
  });
  contract.pullDomainEvents();
  const projectedId = generateUuid();
  deps.projection.findTenantIdByPhone.mockResolvedValue(
    mode === 'phone' ? projectedId : null,
  );
  const room = Room.create({
    landlordId,
    buildingId: generateUuid(),
    name: 'Room 101',
    rentPrice: 3_000_000,
    depositAmount: 0,
  });
  room.pullDomainEvents();
  const mediaId = generateUuid();
  const mediaLookup = {
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
  const members = {
    findActiveByContract: jest.fn<Promise<ContractMember[]>, unknown[]>(
      async () => [],
    ),
    save: jest.fn(async () => undefined),
  };
  const contracts = {
    findById: jest.fn<Promise<ContractEntity | null>, unknown[]>(
      async () => contract,
    ),
    existsBlockingByRoom: jest.fn(async () => false),
    findByIdForUpdate: jest.fn(async () => contract),
    save: jest.fn(async () => undefined),
  };
  const rooms = {
    findByIdForUpdate: jest.fn(async () => room),
    save: jest.fn(async () => undefined),
  };
  const snapshots = {
    create: jest.fn(async () => ({
      contractId: contract.id,
      contractCode: `HD-${contract.id.slice(0, 6)}`,
      roomName: room.name,
      buildingName: 'Building A',
    })),
  };
  const handler = new ContractActivateCommandHandler(
    members as unknown as ContractMemberRepository,
    contracts as unknown as ContractRepository,
    rooms as unknown as RoomRepository,
    deps.unitOfWork,
    deps.outbox as unknown as OutboxRepository,
    mediaLookup,
    deps.projection,
    snapshots as unknown as ContractMemberNotificationSnapshotService,
  );
  const command = new ContractActivateCommand(contract.id, landlordId, [
    mediaId,
  ]);
  return {
    ...deps,
    landlordId,
    contract,
    projectedId,
    room,
    mediaId,
    mediaLookup,
    members,
    contracts,
    rooms,
    snapshots,
    handler,
    command,
  };
}

describe('ContractActivateCommandHandler', () => {
  it.each(['explicit', 'phone', 'unmatched'] as const)(
    'activates with %s tenant identity and appends all events in one transaction',
    async (mode) => {
      const s = setup(mode);
      const result = await s.handler.execute(s.command);
      expect(result).toBe(s.contract);
      expect(s.contract.status).toBe('active');
      expect(s.contract.signedContractMediaIds).toEqual([s.mediaId]);
      expect(s.room.status).toBe('occupied');
      if (mode === 'phone') expect(s.contract.tenantId).toBe(s.projectedId);
      if (mode === 'unmatched') expect(s.contract.tenantId).toBeNull();
      expect(s.projection.lockPhone.mock.invocationCallOrder[0]).toBeLessThan(
        s.contracts.findByIdForUpdate.mock.invocationCallOrder[0],
      );
      if (mode === 'explicit')
        expect(s.projection.findTenantIdByPhone).not.toHaveBeenCalled();
      expect(s.contracts.findById).toHaveBeenCalledWith(
        s.contract.id,
        s.context,
      );
      expect(s.contracts.findByIdForUpdate).toHaveBeenCalledWith(
        s.contract.id,
        s.context,
      );
      expect(s.rooms.findByIdForUpdate).toHaveBeenCalledWith(
        s.contract.roomId,
        s.context,
      );
      expect(s.members.findActiveByContract).toHaveBeenCalledWith(
        s.contract.id,
        s.context,
      );
      expect(s.members.save).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: s.contract.id,
          tenantId: s.contract.tenantId,
        }),
        s.context,
      );
      expect(s.contracts.save).toHaveBeenCalledWith(s.contract, s.context);
      expect(s.rooms.save).toHaveBeenCalledWith(s.room, s.context);
      const [messages, context] = s.outbox.append.mock.calls[0];
      expect(context).toBe(s.context);
      expect(messages.map((event) => event.eventType)).toEqual([
        'contract.activated',
        'contract_member.added',
        'room.status_changed',
        ...(mode === 'unmatched' ? [] : ['notification.requested']),
      ]);
      expect(messages[0].payload).toMatchObject({
        contractId: s.contract.id,
        buildingId: s.room.buildingId,
        roomId: s.contract.roomId,
        landlordId: s.landlordId,
        tenantUserIds: s.contract.tenantId ? [s.contract.tenantId] : [],
      });
      if (mode === 'unmatched') {
        expect(s.snapshots.create).not.toHaveBeenCalled();
      } else {
        expect(s.snapshots.create).toHaveBeenCalledWith(s.contract, s.context);
        expect(messages[3]).toMatchObject({
          aggregateId: s.contract.id,
          aggregateType: 'Contract',
          eventType: 'notification.requested',
          routingKey: 'notification.requested',
          headers: { occurredAt: expect.any(String) },
          payload: {
            sourceService: 'tenancy',
            recipientUserIds: [s.contract.tenantId],
            notification: {
              type: 'system',
              title: ContractNotificationCodeConstant.CONTRACT_ACTIVATED_TITLE,
              body: ContractNotificationCodeConstant.CONTRACT_ACTIVATED_BODY,
              data: {
                messageKey: 'contract.activated',
                contractId: s.contract.id,
                contractCode: `HD-${s.contract.id.slice(0, 6)}`,
                roomName: 'Room 101',
                buildingName: 'Building A',
                startDate: s.contract.startDate,
              },
            },
          },
        });
      }
    },
  );

  it.each(['explicit', 'unmatched'] as const)(
    'notifies distinct linked members with %s representative, ignoring null and actor IDs',
    async (mode) => {
      const s = setup(mode);
      const memberId = generateUuid();
      s.members.findActiveByContract.mockResolvedValue([
        createMember(s.contract.id, s.contract.tenantId),
        createMember(s.contract.id, memberId),
        createMember(s.contract.id, memberId),
        createMember(s.contract.id),
        createMember(s.contract.id, s.landlordId),
      ]);
      await s.handler.execute(s.command);
      const [messages] = s.outbox.append.mock.calls[0];
      const notifications = messages.filter(
        (event) => event.eventType === 'notification.requested',
      );
      expect(notifications).toHaveLength(1);
      expect(notifications[0].payload.recipientUserIds).toEqual([
        ...(s.contract.tenantId ? [s.contract.tenantId] : []),
        memberId,
      ]);
      // The existing activation event still includes all linked identities.
      expect(messages[0].payload.tenantUserIds).toEqual([
        ...(s.contract.tenantId ? [s.contract.tenantId] : []),
        memberId,
        s.landlordId,
      ]);
    },
  );

  it('succeeds without a notification when all linked IDs belong to the actor', async () => {
    const s = setup('actor');
    s.members.findActiveByContract.mockResolvedValue([
      createMember(s.contract.id),
      createMember(s.contract.id, s.landlordId),
    ]);
    await s.handler.execute(s.command);
    expect(s.contract.status).toBe('active');
    expect(s.outbox.append.mock.calls[0][0]).toHaveLength(3);
    expect(s.snapshots.create).not.toHaveBeenCalled();
  });

  it('rejects media outside the contract ownership boundary before opening a transaction', async () => {
    const s = setup();
    s.mediaLookup.findMediaByIds.mockResolvedValue([
      {
        id: s.mediaId,
        ownerType: 'contract',
        ownerId: generateUuid(),
        purpose: 'contract_signed',
        status: 'uploaded',
      },
    ]);
    await expect(s.handler.execute(s.command)).rejects.toThrow(
      SignedFileMissingException,
    );
    expect(s.unitOfWork.run).not.toHaveBeenCalled();
    expect(s.outbox.append).not.toHaveBeenCalled();
    expect(s.contracts.save).not.toHaveBeenCalled();
  });

  it.each(['missing', 'forbidden', 'blocking'])(
    'does not save or append notifications for %s activation',
    async (failure) => {
      const s = setup();
      let landlordId: Uuid = s.landlordId;
      if (failure === 'missing') s.contracts.findById.mockResolvedValue(null);
      if (failure === 'forbidden') landlordId = generateUuid();
      if (failure === 'blocking')
        s.contracts.existsBlockingByRoom.mockResolvedValue(true);
      await expect(
        s.handler.execute(
          new ContractActivateCommand(s.contract.id, landlordId, [s.mediaId]),
        ),
      ).rejects.toThrow();
      expect(s.contracts.save).not.toHaveBeenCalled();
      expect(s.members.save).not.toHaveBeenCalled();
      expect(s.rooms.save).not.toHaveBeenCalled();
      expect(s.snapshots.create).not.toHaveBeenCalled();
      expect(s.outbox.append).not.toHaveBeenCalled();
    },
  );

  it('does not append a notification when a business save fails', async () => {
    const s = setup();
    s.contracts.save.mockRejectedValue(new Error('save failed'));
    await expect(s.handler.execute(s.command)).rejects.toThrow('save failed');
    expect(s.outbox.append).not.toHaveBeenCalled();
  });

  it('propagates outbox failure so the business transaction cannot commit', async () => {
    const s = setup();
    s.outbox.append.mockRejectedValue(new Error('outbox failed'));
    await expect(s.handler.execute(s.command)).rejects.toThrow('outbox failed');
    expect(s.outbox.append).toHaveBeenCalledWith(expect.any(Array), s.context);
  });
});
