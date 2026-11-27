import { ContractMember } from 'modules/contract/domain/entities/contract-member.entity';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { InvoiceCancelCommand } from 'modules/invoice/application/commands/invoice-cancel/invoice-cancel.command';
import { InvoiceCancelCommandHandler } from 'modules/invoice/application/commands/invoice-cancel/invoice-cancel.command.handler';
import { InvoiceOwnershipService } from 'modules/invoice/application/services/invoice-ownership.service';
import { InvoicePersistenceService } from 'modules/invoice/application/services/invoice-persistence.service';
import { InvoiceNotificationCodeConstant } from 'modules/invoice/domain/constants/invoice-notification-code.constant';
import { InvoiceEntity } from 'modules/invoice/domain/entities/invoice.entity';
import { InvoiceStatus } from 'modules/invoice/domain/enums/invoice-status.enum';
import { InvoiceAlreadyVoidedException } from 'modules/invoice/domain/exceptions/invoice-already-voided.exception';
import { InvoiceForbiddenException } from 'modules/invoice/domain/exceptions/invoice-forbidden.exception';
import { InvoiceNotFoundException } from 'modules/invoice/domain/exceptions/invoice-not-found.exception';
import { InvoiceRepository } from 'modules/invoice/domain/repositories/invoice.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';

const issuedAt = new Date('2026-11-15T10:00:00.000Z');
const cancelledAt = new Date('2026-11-27T10:00:00.000Z');

function member(
  tenantId: Uuid | null,
  joinedAt: string,
  leftAt: string | null = null,
): ContractMember {
  return ContractMember.reconstitute({
    id: generateUuid(),
    contractId: generateUuid(),
    tenantId,
    tenantName: tenantId === null ? 'Unlinked tenant' : null,
    tenantPhone: tenantId === null ? '0901234567' : null,
    joinedAt: new Date(`${joinedAt}T00:00:00.000Z`),
    leftAt: leftAt === null ? null : new Date(`${leftAt}T00:00:00.000Z`),
    createdAt: new Date(issuedAt),
    updatedAt: new Date(issuedAt),
    isDeleted: false,
  });
}

function setup(
  membersAtIssue: ContractMember[] = [],
  status = InvoiceStatus.ISSUED,
  landlordId = generateUuid(),
) {
  const invoice = InvoiceEntity.reconstitute({
    id: generateUuid(),
    contractId: generateUuid(),
    code: 'INV-202611-A1B2',
    period: '2026-11',
    rentAmount: '100',
    breakdown: [],
    otherFees: [],
    totalAmount: '100',
    status,
    issuedAt: status === InvoiceStatus.PENDING ? null : new Date(issuedAt),
    voidedInvoiceId: null,
    voidReason: status === InvoiceStatus.VOID ? 'Already cancelled' : null,
    note: null,
    createdAt: new Date(issuedAt),
    updatedAt: new Date(issuedAt),
    isDeleted: false,
  });
  const context: TransactionContext = { kind: 'transaction' };
  const invoices = {
    findByIdForUpdate: jest.fn(async () => invoice),
    save: jest.fn(async () => undefined),
  } as unknown as InvoiceRepository;
  const outbox = {
    append: jest.fn(async () => undefined),
  } as unknown as OutboxRepository;
  const members = {
    findActiveByContractAt: jest.fn(async () => membersAtIssue),
  } as unknown as ContractMemberRepository;
  const contracts = {
    findById: jest.fn(async () => ({ landlordId })),
  } as unknown as ContractRepository;
  const unitOfWork = {
    run: jest.fn(async <T>(work: (ctx: TransactionContext) => Promise<T>) =>
      work(context),
    ),
  } as unknown as IUnitOfWork;
  const persistence = new InvoicePersistenceService(invoices, outbox);
  const handler = new InvoiceCancelCommandHandler(
    invoices,
    unitOfWork,
    new InvoiceOwnershipService(contracts),
    persistence,
    members,
  );
  const command = new InvoiceCancelCommand(
    invoice.id,
    landlordId,
    '  Incorrect meter reading  ',
  );
  return {
    invoice,
    context,
    invoices,
    outbox,
    members,
    contracts,
    unitOfWork,
    handler,
    command,
  };
}

describe('InvoiceCancelCommandHandler notification', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(cancelledAt));
  afterEach(() => jest.useRealTimers());

  it('voids an issued invoice and appends one notification for distinct eligible tenants at issuedAt, excluding the actor', async () => {
    const landlordId = generateUuid();
    const tenantId = generateUuid();
    const formerTenantId = generateUuid();
    const state = setup(
      [
        member(tenantId, '2026-11-01'),
        member(tenantId, '2026-11-01'),
        member(formerTenantId, '2026-11-15', '2026-11-16'),
        member(null, '2026-11-01'),
        member(landlordId, '2026-11-01'),
        member(generateUuid(), '2026-11-16'),
        member(generateUuid(), '2026-11-01', '2026-11-15'),
        member(generateUuid(), '2026-11-01', '2026-11-14'),
      ],
      InvoiceStatus.ISSUED,
      landlordId,
    );

    await expect(state.handler.execute(state.command)).resolves.toBe(
      state.invoice,
    );

    expect(state.invoice.status).toBe(InvoiceStatus.VOID);
    expect(state.invoice.voidReason).toBe('Incorrect meter reading');
    expect(state.unitOfWork.run).toHaveBeenCalledTimes(1);
    expect(state.invoices.findByIdForUpdate).toHaveBeenCalledWith(
      state.invoice.id,
      state.context,
    );
    expect(state.contracts.findById).toHaveBeenCalledWith(
      state.invoice.contractId,
      state.context,
    );
    expect(state.members.findActiveByContractAt).toHaveBeenCalledTimes(1);
    expect(state.members.findActiveByContractAt).toHaveBeenCalledWith(
      state.invoice.contractId,
      issuedAt,
      state.context,
    );
    expect(state.invoices.save).toHaveBeenCalledTimes(1);
    expect(state.invoices.save).toHaveBeenCalledWith(
      state.invoice,
      state.context,
    );
    expect(state.outbox.append).toHaveBeenCalledTimes(1);
    const [messages, context] = (state.outbox.append as jest.Mock).mock
      .calls[0] as [OutboxMessage[], TransactionContext];
    expect(context).toBe(state.context);
    expect(messages.map((message) => message.eventType)).toEqual([
      'invoice.voided',
      'notification.requested',
    ]);
    expect(messages[0].payload).toEqual({
      invoiceId: state.invoice.id,
      contractId: state.invoice.contractId,
      period: '2026-11',
    });
    expect(messages[1].routingKey).toBe('notification.requested');
    expect(messages[1].aggregateType).toBe('Invoice');
    expect(messages[1].aggregateId).toBe(state.invoice.id);
    expect(messages[1].headers).toEqual({
      occurredAt: cancelledAt.toISOString(),
    });
    expect(messages[1].payload).toEqual({
      sourceService: 'tenancy-service',
      recipientUserIds: [tenantId, formerTenantId],
      notification: {
        type: 'invoice',
        title: InvoiceNotificationCodeConstant.INVOICE_VOIDED_TITLE,
        body: InvoiceNotificationCodeConstant.INVOICE_VOIDED_BODY,
        deepLink: `/invoices/${state.invoice.id}`,
        data: {
          messageKey: 'invoice.voided',
          invoiceId: state.invoice.id,
          contractId: state.invoice.contractId,
          period: '2026-11',
          reason: state.invoice.voidReason,
        },
      },
    });
  });

  it('voids a pending invoice with its business event and no notification or recipient lookup', async () => {
    const state = setup(
      [member(generateUuid(), '2026-11-01')],
      InvoiceStatus.PENDING,
    );

    await expect(state.handler.execute(state.command)).resolves.toBe(
      state.invoice,
    );

    expect(state.invoice.status).toBe(InvoiceStatus.VOID);
    expect(state.members.findActiveByContractAt).not.toHaveBeenCalled();
    expect(state.invoices.save).toHaveBeenCalledWith(
      state.invoice,
      state.context,
    );
    const [messages, context] = (state.outbox.append as jest.Mock).mock
      .calls[0] as [OutboxMessage[], TransactionContext];
    expect(context).toBe(state.context);
    expect(messages.map((message) => message.eventType)).toEqual([
      'invoice.voided',
    ]);
  });

  it.each([
    { label: 'no members', members: [] },
    {
      label: 'only ineligible members',
      members: [
        member(null, '2026-11-01'),
        member(generateUuid(), '2026-11-16'),
        member(generateUuid(), '2026-11-01', '2026-11-15'),
      ],
    },
  ])('still voids successfully with $label', async ({ members }) => {
    const state = setup(members);

    await expect(state.handler.execute(state.command)).resolves.toBe(
      state.invoice,
    );

    expect(state.invoice.status).toBe(InvoiceStatus.VOID);
    expect(state.invoices.save).toHaveBeenCalledWith(
      state.invoice,
      state.context,
    );
    const [messages] = (state.outbox.append as jest.Mock).mock.calls[0] as [
      OutboxMessage[],
    ];
    expect(messages.map((message) => message.eventType)).toEqual([
      'invoice.voided',
    ]);
  });

  it('does not notify when the actor is the only eligible member', async () => {
    const landlordId = generateUuid();
    const state = setup(
      [member(landlordId, '2026-11-01')],
      InvoiceStatus.ISSUED,
      landlordId,
    );

    await state.handler.execute(state.command);

    expect(state.invoice.status).toBe(InvoiceStatus.VOID);
    const [messages] = (state.outbox.append as jest.Mock).mock.calls[0] as [
      OutboxMessage[],
    ];
    expect(messages.map((message) => message.eventType)).toEqual([
      'invoice.voided',
    ]);
  });

  it('rejects a missing invoice without saving or appending events', async () => {
    const state = setup();
    (state.invoices.findByIdForUpdate as jest.Mock).mockResolvedValueOnce(null);

    await expect(state.handler.execute(state.command)).rejects.toThrow(
      InvoiceNotFoundException,
    );

    expect(state.contracts.findById).not.toHaveBeenCalled();
    expect(state.members.findActiveByContractAt).not.toHaveBeenCalled();
    expect(state.invoices.save).not.toHaveBeenCalled();
    expect(state.outbox.append).not.toHaveBeenCalled();
  });

  it('rejects a foreign landlord without saving or appending events', async () => {
    const state = setup();
    (state.contracts.findById as jest.Mock).mockResolvedValueOnce({
      landlordId: generateUuid(),
    });

    await expect(state.handler.execute(state.command)).rejects.toThrow(
      InvoiceForbiddenException,
    );

    expect(state.invoice.status).toBe(InvoiceStatus.ISSUED);
    expect(state.members.findActiveByContractAt).not.toHaveBeenCalled();
    expect(state.invoices.save).not.toHaveBeenCalled();
    expect(state.outbox.append).not.toHaveBeenCalled();
  });

  it.each(['', '   ', 'x'.repeat(501), null, 123])(
    'rejects an invalid reason (%p) without saving or appending events',
    async (reason) => {
      const state = setup();
      const command = new InvoiceCancelCommand(
        state.invoice.id,
        state.command.landlordId,
        reason as string,
      );

      await expect(state.handler.execute(command)).rejects.toThrow(
        ValidationException,
      );

      expect(state.invoice.status).toBe(InvoiceStatus.ISSUED);
      expect(state.members.findActiveByContractAt).not.toHaveBeenCalled();
      expect(state.invoices.save).not.toHaveBeenCalled();
      expect(state.outbox.append).not.toHaveBeenCalled();
    },
  );

  it('rejects an already void invoice without saving or appending events', async () => {
    const state = setup([], InvoiceStatus.VOID);

    await expect(state.handler.execute(state.command)).rejects.toThrow(
      InvoiceAlreadyVoidedException,
    );

    expect(state.members.findActiveByContractAt).not.toHaveBeenCalled();
    expect(state.invoices.save).not.toHaveBeenCalled();
    expect(state.outbox.append).not.toHaveBeenCalled();
  });

  it('does not append another notification when cancellation is replayed', async () => {
    const state = setup([member(generateUuid(), '2026-11-01')]);

    await state.handler.execute(state.command);
    await expect(state.handler.execute(state.command)).rejects.toThrow(
      InvoiceAlreadyVoidedException,
    );

    expect(state.members.findActiveByContractAt).toHaveBeenCalledTimes(1);
    expect(state.invoices.save).toHaveBeenCalledTimes(1);
    expect(state.outbox.append).toHaveBeenCalledTimes(1);
  });

  it('propagates outbox failure through the cancellation transaction', async () => {
    const state = setup([member(generateUuid(), '2026-11-01')]);
    const failure = new Error('outbox unavailable');
    (state.outbox.append as jest.Mock).mockRejectedValueOnce(failure);

    await expect(state.handler.execute(state.command)).rejects.toBe(failure);

    expect(state.unitOfWork.run).toHaveBeenCalledTimes(1);
    expect(state.invoices.save).toHaveBeenCalledWith(
      state.invoice,
      state.context,
    );
    expect(state.outbox.append).toHaveBeenCalledWith(
      expect.anything(),
      state.context,
    );
  });

  it('propagates save failure without appending events', async () => {
    const state = setup([member(generateUuid(), '2026-11-01')]);
    const failure = new Error('save unavailable');
    (state.invoices.save as jest.Mock).mockRejectedValueOnce(failure);

    await expect(state.handler.execute(state.command)).rejects.toBe(failure);

    expect(state.outbox.append).not.toHaveBeenCalled();
  });
});
