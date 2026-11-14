import { ContractMember } from 'modules/contract/domain/entities/contract-member.entity';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { InvoiceIssueItemService } from 'modules/invoice/application/services/invoice-issue-item.service';
import { InvoiceOwnershipService } from 'modules/invoice/application/services/invoice-ownership.service';
import { InvoicePersistenceService } from 'modules/invoice/application/services/invoice-persistence.service';
import { InvoiceEntity } from 'modules/invoice/domain/entities/invoice.entity';
import { InvoiceStatus } from 'modules/invoice/domain/enums/invoice-status.enum';
import { InvoiceRepository } from 'modules/invoice/domain/repositories/invoice.repository';
import { OutboxMessage } from 'modules/outbox/domain/entities/outbox-message.entity';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';

const issuedAt = new Date('2026-11-15T10:00:00.000Z');

function pendingInvoice(): InvoiceEntity {
  return InvoiceEntity.reconstitute({
    id: generateUuid(),
    contractId: generateUuid(),
    code: 'INV-202611-A1B2',
    period: '2026-11',
    rentAmount: '100',
    breakdown: [],
    otherFees: [],
    totalAmount: '100',
    status: InvoiceStatus.PENDING,
    issuedAt: null,
    voidedInvoiceId: null,
    voidReason: null,
    note: null,
    createdAt: issuedAt,
    updatedAt: issuedAt,
    isDeleted: false,
  });
}

function member(
  tenantId: Uuid | null,
  joinedAt: string,
  leftAt: string | null = null,
): ContractMember {
  return {
    tenantId,
    joinedAt: new Date(`${joinedAt}T00:00:00.000Z`),
    isActive: () => leftAt === null || leftAt > '2026-11-15',
  } as ContractMember;
}

function setup(membersAtIssue: ContractMember[]) {
  const invoice = pendingInvoice();
  const landlordId = generateUuid();
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
  const unitOfWork = {
    run: jest.fn(async <T>(work: (ctx: TransactionContext) => Promise<T>) =>
      work(context),
    ),
  } as unknown as IUnitOfWork;
  const ownership = {
    isOwnedByLandlord: jest.fn(async () => true),
  } as unknown as InvoiceOwnershipService;
  const persistence = new InvoicePersistenceService(invoices, outbox);
  const service = new InvoiceIssueItemService(
    invoices,
    unitOfWork,
    persistence,
    ownership,
    members,
  );
  return { invoice, landlordId, context, invoices, outbox, members, service };
}

describe('InvoiceIssueItemService notification', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(issuedAt));
  afterEach(() => jest.useRealTimers());

  it('appends one notification request for distinct linked members present on issue day', async () => {
    const tenantId = generateUuid();
    const secondTenantId = generateUuid();
    const state = setup([
      member(tenantId, '2026-11-01'),
      member(tenantId, '2026-11-01'),
      member(secondTenantId, '2026-11-15', '2026-11-16'),
      member(null, '2026-11-01'),
      member(generateUuid(), '2026-11-16'),
      member(generateUuid(), '2026-11-01', '2026-11-15'),
    ]);

    await state.service.issue(state.invoice.id, state.landlordId);

    expect(state.members.findActiveByContractAt).toHaveBeenCalledWith(
      state.invoice.contractId,
      issuedAt,
      state.context,
    );
    expect(state.invoices.save).toHaveBeenCalledWith(
      state.invoice,
      state.context,
    );
    const [messages, context] = (state.outbox.append as jest.Mock).mock
      .calls[0] as [OutboxMessage[], TransactionContext];
    expect(context).toBe(state.context);
    expect(messages.map((message) => message.eventType)).toEqual([
      'invoice.issued',
      'notification.requested',
    ]);
    expect(messages[1].payload).toEqual({
      sourceService: 'tenancy-service',
      recipientUserIds: [tenantId, secondTenantId],
      notification: {
        type: 'invoice',
        title: 'Hóa đơn đã được phát hành',
        body: 'Hóa đơn kỳ 2026-11 đã được phát hành.',
        deepLink: `/invoices/${state.invoice.id}`,
        data: {
          invoiceId: state.invoice.id,
          contractId: state.invoice.contractId,
          period: '2026-11',
        },
      },
    });
  });

  it('issues without a notification request when no linked member is eligible', async () => {
    const state = setup([
      member(null, '2026-11-01'),
      member(generateUuid(), '2026-11-16'),
    ]);

    await state.service.issue(state.invoice.id, state.landlordId);

    const [messages] = (state.outbox.append as jest.Mock).mock.calls[0] as [
      OutboxMessage[],
    ];
    expect(messages.map((message) => message.eventType)).toEqual([
      'invoice.issued',
    ]);
    expect(state.invoice.status).toBe(InvoiceStatus.ISSUED);
  });
});
