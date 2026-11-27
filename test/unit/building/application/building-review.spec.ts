import { BuildingApproveCommandHandler } from 'modules/building/application/commands/building-approve/building-approve.command.handler';
import { BuildingApproveCommand } from 'modules/building/application/commands/building-approve/building-approve.command';
import { BuildingRejectCommandHandler } from 'modules/building/application/commands/building-reject/building-reject.command.handler';
import { BuildingRejectCommand } from 'modules/building/application/commands/building-reject/building-reject.command';
import { BuildingNotificationCodeConstant } from 'modules/building/domain/constants/building-notification-code.constant';
import { BuildingEntity } from 'modules/building/domain/entities/building.entity';
import { BuildingStatus } from 'modules/building/domain/enums/building-status.enum';
import { BuildingNotFoundException } from 'modules/building/domain/exceptions/building-not-found.exception';
import { BuildingNoteRequiredException } from 'modules/building/domain/exceptions/building-note-required.exception';
import { InvalidBuildingStatusTransitionException } from 'modules/building/domain/exceptions/invalid-building-status-transition.exception';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

const reviewedAt = new Date('2026-11-27T03:00:00.000Z');

function setup(action: 'approve' | 'reject') {
  const building = BuildingEntity.create({
    landlordId: generateUuid(),
    name: 'Riverside',
    province: 'Da Nang',
    ward: 'Hai Chau',
    address: '1 River Road',
    latitude: 16.0678,
    longitude: 108.2208,
  });
  building.pullDomainEvents();
  const context: TransactionContext = { kind: 'transaction' };
  const buildings = {
    findByIdForUpdate: jest.fn(async () => building),
    save: jest.fn(async () => undefined),
  } as unknown as BuildingRepository;
  const outbox = {
    append: jest.fn(async () => undefined),
  } as unknown as OutboxRepository;
  const unitOfWork = {
    run: jest.fn(async <T>(work: (ctx: TransactionContext) => Promise<T>) =>
      work(context),
    ),
  } as unknown as IUnitOfWork;
  const handler =
    action === 'approve'
      ? new BuildingApproveCommandHandler(buildings, unitOfWork, outbox)
      : new BuildingRejectCommandHandler(buildings, unitOfWork, outbox);
  const adminId = generateUuid();
  const command =
    action === 'approve'
      ? new BuildingApproveCommand(adminId, building.id, 'Proof verified')
      : new BuildingRejectCommand(adminId, building.id, 'Proof unreadable');
  return { building, context, buildings, outbox, handler, command };
}

function appendedMessages(outbox: OutboxRepository): OutboxMessage[] {
  return (outbox.append as jest.Mock).mock.calls[0][0] as OutboxMessage[];
}

describe.each([
  {
    action: 'approve' as const,
    messageKey: 'building.approved',
    status: BuildingStatus.APPROVED,
    title: BuildingNotificationCodeConstant.BUILDING_APPROVED_TITLE,
    body: BuildingNotificationCodeConstant.BUILDING_APPROVED_BODY,
  },
  {
    action: 'reject' as const,
    messageKey: 'building.rejected',
    status: BuildingStatus.REJECTED,
    title: BuildingNotificationCodeConstant.BUILDING_REJECTED_TITLE,
    body: BuildingNotificationCodeConstant.BUILDING_REJECTED_BODY,
  },
])(
  'Building $action notification',
  ({ action, messageKey, status, title, body }) => {
    beforeEach(() => jest.useFakeTimers().setSystemTime(reviewedAt));
    afterEach(() => jest.useRealTimers());

    it('saves the review and both outbox messages in the same transaction', async () => {
      const state = setup(action);

      await expect(state.handler.execute(state.command)).resolves.toBe(
        state.building,
      );

      expect(state.buildings.findByIdForUpdate).toHaveBeenCalledWith(
        state.building.id,
        state.context,
      );
      expect(state.buildings.save).toHaveBeenCalledWith(
        state.building,
        state.context,
      );
      expect(state.outbox.append).toHaveBeenCalledTimes(1);
      const messages = appendedMessages(state.outbox);
      expect(state.outbox.append).toHaveBeenCalledWith(messages, state.context);
      expect(messages.map((message) => message.eventType)).toEqual([
        messageKey,
        'notification.requested',
      ]);
      expect(messages[0].payload).toEqual({
        id: state.building.id,
        status,
        reviewedBy: state.command.adminId,
        reviewedAt: reviewedAt.toISOString(),
        note: state.command.note,
      });
      expect(messages[1].routingKey).toBe('notification.requested');
      expect(messages[1].aggregateType).toBe('Building');
      expect(messages[1].aggregateId).toBe(state.building.id);
      expect(messages[1].headers).toEqual({
        occurredAt: reviewedAt.toISOString(),
      });
      expect(messages[1].id).not.toBe(messages[0].id);
      expect(messages[1].payload).toEqual({
        sourceService: 'tenancy-service',
        recipientUserIds: [state.building.landlordId],
        notification: {
          type: 'system',
          title,
          body,
          deepLink: `/buildings/${state.building.id}`,
          data: {
            messageKey,
            buildingId: state.building.id,
            buildingName: 'Riverside',
            note: state.command.note,
          },
        },
      });
    });

    it('keeps the business event without notifying the acting landlord', async () => {
      const state = setup(action);
      const command =
        action === 'approve'
          ? new BuildingApproveCommand(
              state.building.landlordId,
              state.building.id,
              state.command.note,
            )
          : new BuildingRejectCommand(
              state.building.landlordId,
              state.building.id,
              state.command.note,
            );

      await state.handler.execute(command);

      expect(state.building.status).toBe(status);
      expect(state.buildings.save).toHaveBeenCalledWith(
        state.building,
        state.context,
      );
      const messages = appendedMessages(state.outbox);
      expect(messages.map((message) => message.eventType)).toEqual([
        messageKey,
      ]);
      expect(messages[0].payload).toEqual({
        id: state.building.id,
        status,
        reviewedBy: state.building.landlordId,
        reviewedAt: reviewedAt.toISOString(),
        note: state.command.note,
      });
    });

    it('does not save or append notifications for a missing building', async () => {
      const state = setup(action);
      (state.buildings.findByIdForUpdate as jest.Mock).mockResolvedValueOnce(
        null,
      );

      await expect(state.handler.execute(state.command)).rejects.toThrow(
        BuildingNotFoundException,
      );

      expect(state.buildings.save).not.toHaveBeenCalled();
      expect(state.outbox.append).not.toHaveBeenCalled();
    });

    it.each(['approved', 'rejected'] as const)(
      'does not notify when already %s',
      async (previous) => {
        const state = setup(action);
        if (previous === 'approved')
          state.building.approve(generateUuid(), 'Reviewed');
        else state.building.reject(generateUuid(), 'Unclear proof');
        state.building.pullDomainEvents();

        await expect(state.handler.execute(state.command)).rejects.toThrow(
          InvalidBuildingStatusTransitionException,
        );

        expect(state.buildings.save).not.toHaveBeenCalled();
        expect(state.outbox.append).not.toHaveBeenCalled();
        expect(state.building.pullDomainEvents()).toEqual([]);
      },
    );

    it('propagates outbox failure through the review transaction', async () => {
      const state = setup(action);
      const failure = new Error('outbox unavailable');
      (state.outbox.append as jest.Mock).mockRejectedValueOnce(failure);

      await expect(state.handler.execute(state.command)).rejects.toBe(failure);

      expect(state.buildings.save).toHaveBeenCalledWith(
        state.building,
        state.context,
      );
      expect(state.outbox.append).toHaveBeenCalledWith(
        expect.anything(),
        state.context,
      );
    });

    it('does not append notifications if saving the building fails', async () => {
      const state = setup(action);
      const failure = new Error('save unavailable');
      (state.buildings.save as jest.Mock).mockRejectedValueOnce(failure);

      await expect(state.handler.execute(state.command)).rejects.toBe(failure);

      expect(state.outbox.append).not.toHaveBeenCalled();
    });
  },
);

describe('Building review snapshots', () => {
  it('keeps the rejection snapshot after the building is renamed', async () => {
    const state = setup('reject');
    await state.handler.execute(state.command);
    const message = appendedMessages(state.outbox)[1];

    state.building.update({ name: 'New name' });

    expect(message.payload.notification).toMatchObject({
      data: { buildingName: 'Riverside', note: 'Proof unreadable' },
    });
  });

  it('preserves a null note when approve is called internally without a note', async () => {
    const state = setup('approve');
    const command = new BuildingApproveCommand(
      state.command.adminId,
      state.building.id,
      undefined as unknown as string,
    );

    await state.handler.execute(command);

    expect(
      appendedMessages(state.outbox)[1].payload.notification,
    ).toMatchObject({
      data: {
        messageKey: 'building.approved',
        buildingName: 'Riverside',
        note: null,
      },
    });
  });

  it.each(['', '   ', undefined])(
    'does not notify when reject note is %p',
    async (note) => {
      const state = setup('reject');
      const command = new BuildingRejectCommand(
        state.command.adminId,
        state.building.id,
        note as string,
      );

      await expect(state.handler.execute(command)).rejects.toThrow(
        BuildingNoteRequiredException,
      );

      expect(state.building.status).toBe(BuildingStatus.PENDING);
      expect(state.buildings.save).not.toHaveBeenCalled();
      expect(state.outbox.append).not.toHaveBeenCalled();
      expect(state.building.pullDomainEvents()).toEqual([]);
    },
  );
});
