import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { ContractCheckoutCompleteCommand } from 'modules/contract/application/commands/contract-checkout-complete/contract-checkout-complete.command';
import { ContractCheckoutCompleteCommandHandler } from 'modules/contract/application/commands/contract-checkout-complete/contract-checkout-complete.command.handler';
import { ContractMemberNotificationSnapshotService } from 'modules/contract/application/services/contract-member-notification-snapshot.service';
import { ContractNotificationCodeConstant } from 'modules/contract/domain/constants/contract-notification-code.constant';
import { ContractStatus } from 'modules/contract/domain/enums/contract-status.enum';
import { ContractEntity } from 'modules/contract/domain/entities/contract.entity';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { Room } from 'modules/room/domain/entities/room.entity';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  createContract,
  createLinkDependencies,
  createMember,
} from '../support/contract-link.fixture';

function setup(lockHandover = false, tenantId: Uuid | null = generateUuid()) {
  const deps = createLinkDependencies();
  const contract = createContract(
    tenantId,
    generateUuid(),
    lockHandover
      ? {
          status: ContractStatus.TERMINATED,
          lockTerminationCycleId: generateUuid(),
        }
      : {},
  );
  const memberId = generateUuid();
  const activeMembers = [
    createMember(contract.id, tenantId),
    createMember(contract.id, memberId),
    createMember(contract.id, memberId),
    createMember(contract.id),
    createMember(contract.id, contract.landlordId),
  ];
  const contracts = {
    findByIdForUpdate: jest.fn<Promise<ContractEntity | null>, unknown[]>(
      async () => contract,
    ),
    save: jest.fn(async () => undefined),
  };
  const members = {
    findActiveByContract: jest.fn(async () => activeMembers),
    saveMany: jest.fn(async () => undefined),
  };
  const room = Room.create({
    landlordId: contract.landlordId,
    buildingId: generateUuid(),
    name: 'Room 101',
    rentPrice: 3_000_000,
    depositAmount: 0,
  });
  room.occupyByContract();
  room.pullDomainEvents();
  const rooms = {
    findByIdForUpdate: jest.fn<Promise<Room | null>, unknown[]>(
      async () => room,
    ),
    findById: jest.fn(async () => room),
    save: jest.fn(async () => undefined),
  };
  const buildings = {
    findById: jest.fn(async () => ({ name: 'Building A' })),
  };
  const settlement = { isPeriodSettled: jest.fn(async () => true) };
  const snapshots = new ContractMemberNotificationSnapshotService(
    rooms as unknown as RoomRepository,
    buildings as unknown as BuildingRepository,
  );
  jest.spyOn(snapshots, 'create');
  const handler = new ContractCheckoutCompleteCommandHandler(
    contracts as unknown as ContractRepository,
    members as unknown as ContractMemberRepository,
    rooms as unknown as RoomRepository,
    settlement,
    deps.unitOfWork,
    deps.outbox as unknown as OutboxRepository,
    snapshots,
  );
  const command = new ContractCheckoutCompleteCommand(
    contract.id,
    contract.landlordId,
    new Date('2026-11-20'),
  );
  return {
    ...deps,
    contract,
    memberId,
    activeMembers,
    contracts,
    members,
    room,
    rooms,
    buildings,
    settlement,
    snapshots,
    handler,
    command,
  };
}

describe('ContractCheckoutCompleteCommandHandler notification (P12-07)', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-27T00:00:00.000Z'));
  });
  afterEach(() => jest.useRealTimers());

  it.each([false, true])(
    'completes checkout (lock handover: %s), preserving events and appending one notification in the same transaction',
    async (lockHandover) => {
      const s = setup(lockHandover);
      const leaveSpies = s.activeMembers.map((member) =>
        jest.spyOn(member, 'leave'),
      );
      const tenantIdSpies = s.activeMembers.map((member) =>
        jest.spyOn(member, 'tenantId', 'get'),
      );
      const result = await s.handler.execute(s.command);
      expect(result).toBe(s.contract);
      expect(s.contract.status).toBe('terminated');
      expect(s.contract.endDate).toBe('2026-12-31');
      expect(s.contract.handoverCompletedOn).toBe(
        lockHandover ? '2026-11-20' : null,
      );
      expect(s.room.status).toBe('maintenance');
      expect(s.contracts.findByIdForUpdate).toHaveBeenCalledWith(
        s.contract.id,
        s.context,
      );
      expect(s.members.findActiveByContract).toHaveBeenCalledTimes(1);
      expect(s.members.findActiveByContract).toHaveBeenCalledWith(
        s.contract.id,
        s.context,
      );
      for (const leave of leaveSpies) {
        expect(leave).toHaveBeenCalledWith(s.command.completedOn, true);
        expect(
          s.members.findActiveByContract.mock.invocationCallOrder[0],
        ).toBeLessThan(leave.mock.invocationCallOrder[0]);
      }
      tenantIdSpies.forEach((tenantId, index) => {
        expect(tenantId.mock.invocationCallOrder[0]).toBeLessThan(
          leaveSpies[index].mock.invocationCallOrder[0],
        );
      });
      expect(s.activeMembers.every((member) => member.status === 'left')).toBe(
        true,
      );
      expect(s.contracts.save).toHaveBeenCalledWith(s.contract, s.context);
      expect(s.members.saveMany).toHaveBeenCalledWith(
        s.activeMembers,
        s.context,
      );
      expect(s.rooms.save).toHaveBeenCalledWith(s.room, s.context);
      expect(s.rooms.findByIdForUpdate).toHaveBeenCalledWith(
        s.contract.roomId,
        s.context,
      );
      expect(s.snapshots.create).toHaveBeenCalledWith(s.contract, s.context);
      expect(s.rooms.findById).toHaveBeenCalledWith(
        s.contract.roomId,
        s.context,
      );
      expect(s.buildings.findById).toHaveBeenCalledWith(
        s.room.buildingId,
        s.context,
      );
      if (lockHandover) {
        expect(s.settlement.isPeriodSettled).not.toHaveBeenCalled();
      } else {
        expect(s.settlement.isPeriodSettled).toHaveBeenCalledWith(
          s.contract.id,
          '2026-11',
          s.context,
        );
      }
      const [messages, context] = s.outbox.append.mock.calls[0];
      expect(context).toBe(s.context);
      expect(messages.map((event) => event.eventType)).toEqual([
        ...(lockHandover ? [] : ['contract.terminated']),
        ...s.activeMembers.map(() => 'contract_member.left'),
        'room.status_changed',
        'notification.requested',
      ]);
      const notification = messages[messages.length - 1];
      expect(notification).toMatchObject({
        aggregateId: s.contract.id,
        aggregateType: 'Contract',
        eventType: 'notification.requested',
        routingKey: 'notification.requested',
        headers: { occurredAt: expect.any(String) },
      });
      expect(notification.payload).toEqual({
        sourceService: 'tenancy',
        recipientUserIds: [s.contract.tenantId, s.memberId],
        notification: {
          type: 'system',
          title: ContractNotificationCodeConstant.CONTRACT_CHECKED_OUT_TITLE,
          body: ContractNotificationCodeConstant.CONTRACT_CHECKED_OUT_BODY,
          data: {
            messageKey: 'contract.checked_out',
            contractId: s.contract.id,
            contractCode: `HD-${s.contract.id.slice(0, 6)}`,
            roomName: 'Room 101',
            buildingName: 'Building A',
            endDate: '2026-12-31',
          },
        },
      });
    },
  );

  it.each([false, true])(
    'notifies a linked representative without members (lock handover: %s)',
    async (lockHandover) => {
      const s = setup(lockHandover);
      s.members.findActiveByContract.mockResolvedValue([]);
      await s.handler.execute(s.command);
      const notifications = s.outbox.append.mock.calls[0][0].filter(
        (event) => event.eventType === 'notification.requested',
      );
      expect(notifications).toHaveLength(1);
      expect(notifications[0].payload.recipientUserIds).toEqual([
        s.contract.tenantId,
      ]);
    },
  );

  it('notifies linked members when the representative has no account', async () => {
    const s = setup(false, null);
    await s.handler.execute(s.command);
    const [messages] = s.outbox.append.mock.calls[0];
    expect(messages[messages.length - 1].payload.recipientUserIds).toEqual([
      s.memberId,
    ]);
  });

  it.each([false, true])(
    'succeeds without any eligible recipients (lock handover: %s)',
    async (lockHandover) => {
      const s = setup(lockHandover, null);
      s.members.findActiveByContract.mockResolvedValue([
        createMember(s.contract.id),
        createMember(s.contract.id, s.contract.landlordId),
      ]);
      await s.handler.execute(s.command);
      expect(s.contract.status).toBe('terminated');
      expect(
        s.outbox.append.mock.calls[0][0].every(
          (event) => event.eventType !== 'notification.requested',
        ),
      ).toBe(true);
      expect(s.snapshots.create).not.toHaveBeenCalled();
    },
  );

  it('excludes a representative whose ID belongs to the acting landlord', async () => {
    const s = setup();
    jest
      .spyOn(s.contract, 'tenantId', 'get')
      .mockReturnValue(s.contract.landlordId);
    s.members.findActiveByContract.mockResolvedValue([]);
    await s.handler.execute(s.command);
    expect(
      s.outbox.append.mock.calls[0][0].map((event) => event.eventType),
    ).toEqual(['contract.terminated', 'room.status_changed']);
  });

  it('replays a completed lock handover without saves, lookups or duplicate notifications', async () => {
    const s = setup(true);
    await s.handler.execute(s.command);
    const firstNotification = s.outbox.append.mock.calls[0][0].find(
      (event) => event.eventType === 'notification.requested',
    );
    expect(firstNotification).toBeDefined();
    jest.clearAllMocks();
    expect(await s.handler.execute(s.command)).toBe(s.contract);
    expect(s.members.findActiveByContract).not.toHaveBeenCalled();
    expect(s.rooms.findByIdForUpdate).not.toHaveBeenCalled();
    expect(s.snapshots.create).not.toHaveBeenCalled();
    expect(s.contracts.save).not.toHaveBeenCalled();
    expect(s.members.saveMany).not.toHaveBeenCalled();
    expect(s.rooms.save).not.toHaveBeenCalled();
    expect(s.outbox.append).not.toHaveBeenCalled();
  });

  it('rejects a conflicting lock handover replay without another notification', async () => {
    const s = setup(true);
    s.contract.completeLockHandover(new Date('2026-11-19'));
    await expect(s.handler.execute(s.command)).rejects.toMatchObject({
      code: 'CONTRACT_HANDOVER_CONFLICT',
    });
    expect(s.contracts.save).not.toHaveBeenCalled();
    expect(s.outbox.append).not.toHaveBeenCalled();
  });

  it.each([
    'missing',
    'forbidden',
    'unsettled',
    'invalid-date',
    'invalid-state',
  ])(
    'does not save or append notifications for %s checkout',
    async (failure) => {
      const s = setup();
      let landlordId: Uuid = s.contract.landlordId;
      let completedOn = s.command.completedOn;
      if (failure === 'missing')
        s.contracts.findByIdForUpdate.mockResolvedValue(null);
      if (failure === 'forbidden') landlordId = generateUuid();
      if (failure === 'unsettled')
        s.settlement.isPeriodSettled.mockResolvedValue(false);
      if (failure === 'invalid-date') completedOn = new Date('2025-12-31');
      if (failure === 'invalid-state') s.contract.terminate(completedOn);
      await expect(
        s.handler.execute(
          new ContractCheckoutCompleteCommand(
            s.contract.id,
            landlordId,
            completedOn,
          ),
        ),
      ).rejects.toThrow();
      expect(s.contracts.save).not.toHaveBeenCalled();
      expect(s.members.saveMany).not.toHaveBeenCalled();
      expect(s.rooms.save).not.toHaveBeenCalled();
      expect(s.snapshots.create).not.toHaveBeenCalled();
      expect(s.outbox.append).not.toHaveBeenCalled();
    },
  );

  it.each([false, true])(
    'does not save or append notifications when a member cannot leave (lock handover: %s)',
    async (lockHandover) => {
      const s = setup(lockHandover);
      jest.spyOn(s.activeMembers[0], 'leave').mockImplementation(() => {
        throw new Error('leave failed');
      });
      await expect(s.handler.execute(s.command)).rejects.toThrow(
        'leave failed',
      );
      expect(s.contracts.save).not.toHaveBeenCalled();
      expect(s.members.saveMany).not.toHaveBeenCalled();
      expect(s.rooms.save).not.toHaveBeenCalled();
      expect(s.outbox.append).not.toHaveBeenCalled();
    },
  );

  it('does not append a notification when a business save fails', async () => {
    const s = setup();
    s.members.saveMany.mockRejectedValue(new Error('save failed'));
    await expect(s.handler.execute(s.command)).rejects.toThrow('save failed');
    expect(s.outbox.append).not.toHaveBeenCalled();
  });

  it('propagates outbox failure so the business transaction cannot commit', async () => {
    const s = setup();
    s.outbox.append.mockRejectedValue(new Error('outbox failed'));
    await expect(s.handler.execute(s.command)).rejects.toThrow('outbox failed');
    expect(s.contracts.save).toHaveBeenCalledWith(s.contract, s.context);
    expect(s.outbox.append).toHaveBeenCalledWith(expect.any(Array), s.context);
  });
});
