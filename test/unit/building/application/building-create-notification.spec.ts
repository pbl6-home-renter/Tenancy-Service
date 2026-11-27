import { BuildingCreateCommand } from 'modules/building/application/commands/building-create/building-create.command';
import { BuildingCreateCommandHandler } from 'modules/building/application/commands/building-create/building-create.command.handler';
import { BuildingNotificationRecipientReader } from 'modules/building/application/ports/building-notification-recipient-reader.port';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { BuildingNotificationCodeConstant } from 'modules/building/domain/constants/building-notification-code.constant';
import { IGeocodingPort } from 'modules/building/application/ports/geocoding.port';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function setup() {
  const context: TransactionContext = { kind: 'transaction' };
  const calls: string[] = [];
  const repository = {
    save: jest.fn(async () => {
      calls.push('save');
    }),
  };
  const outbox = {
    append: jest.fn(
      async (_messages: OutboxMessage[], _context: TransactionContext) => {
        calls.push('outbox');
      },
    ),
  };
  const recipients = { findForLandlord: jest.fn() };
  const unitOfWork = {
    run: jest.fn(
      async (work: (ctx: TransactionContext) => Promise<unknown>) => {
        calls.push('transaction');
        return work(context);
      },
    ),
  };
  const geocoding = {
    geocode: jest.fn(async () => ({ latitude: 10.8, longitude: 106.7 })),
  };
  const handler = new BuildingCreateCommandHandler(
    repository as unknown as BuildingRepository,
    geocoding as unknown as IGeocodingPort,
    unitOfWork as unknown as IUnitOfWork,
    outbox as unknown as OutboxRepository,
    recipients as unknown as BuildingNotificationRecipientReader,
  );
  const command = new BuildingCreateCommand(
    generateUuid(),
    'Tòa A',
    'Hồ Chí Minh',
    'Phường 1',
    'Số 1',
  );
  return {
    handler,
    command,
    context,
    calls,
    repository,
    outbox,
    recipients,
    unitOfWork,
  };
}

describe('BuildingCreateCommandHandler notification', () => {
  it('looks up all admins before transaction and persists the notification event with building creation', async () => {
    const setupResult = setup();
    const { handler, command, context, calls, repository, outbox, recipients } =
      setupResult;
    const adminIds = [generateUuid(), generateUuid()];
    recipients.findForLandlord.mockImplementation(async () => {
      calls.push('identity');
      return { adminIds, landlordName: 'Chủ nhà A' };
    });

    const building = await handler.execute(command);

    expect(calls).toEqual(['identity', 'transaction', 'save', 'outbox']);
    expect(repository.save).toHaveBeenCalledWith(building, context);
    const [messages, passedContext] = outbox.append.mock.calls[0];
    expect(passedContext).toBe(context);
    expect(messages).toHaveLength(2);
    expect(messages[0].eventType).toBe('building.created');
    expect(messages[1]).toMatchObject({
      eventType: 'notification.requested',
      aggregateId: building.id,
      payload: {
        sourceService: 'tenancy-service',
        recipientUserIds: adminIds,
        notification: {
          type: 'system',
          title: BuildingNotificationCodeConstant.PENDING_REVIEW_TITLE,
          body: BuildingNotificationCodeConstant.PENDING_REVIEW_BODY,
          deepLink: `/admin/buildings/${building.id}`,
          data: {
            messageKey: 'building.pending_review',
            buildingId: building.id,
            buildingName: 'Tòa A',
            landlordName: 'Chủ nhà A',
          },
        },
      },
    });
  });

  it('still creates the building without a notification when the reader reports Identity failure', async () => {
    const { handler, command, outbox, recipients, repository } = setup();
    recipients.findForLandlord.mockResolvedValue(null);

    await handler.execute(command);

    expect(repository.save).toHaveBeenCalledTimes(1);
    const [messages] = outbox.append.mock.calls[0];
    expect(messages).toHaveLength(1);
    expect(messages[0].eventType).toBe('building.created');
  });

  it('does not emit a notification when no admin is active', async () => {
    const { handler, command, outbox, recipients } = setup();
    recipients.findForLandlord.mockResolvedValue(null);

    await handler.execute(command);

    const [messages] = outbox.append.mock.calls[0];
    expect(messages).toHaveLength(1);
    expect(messages[0].eventType).toBe('building.created');
  });
});
