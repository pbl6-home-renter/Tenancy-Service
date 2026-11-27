import { ContractMemberLeaveCommand } from 'modules/contract/application/commands/contract-member-leave/contract-member-leave.command';
import { ContractMemberLeaveCommandHandler } from 'modules/contract/application/commands/contract-member-leave/contract-member-leave.command.handler';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import {
  createContract,
  createLinkDependencies,
  createMember,
} from '../support/contract-link.fixture';

function setup() {
  const deps = createLinkDependencies();
  const contract = createContract();
  const leaving = createMember(contract.id, generateUuid());
  const remaining = createMember(contract.id, generateUuid());
  const unlinked = createMember(contract.id);
  const actorAsMember = createMember(contract.id, contract.landlordId);
  const contracts = { findByIdForUpdate: jest.fn(async () => contract) };
  const members = {
    findByTenantAndContractForUpdate: jest.fn(async () => leaving),
    findByIdForUpdate: jest.fn(async () => null),
    findActiveByContract: jest.fn(async () => [
      leaving,
      remaining,
      remaining,
      unlinked,
      actorAsMember,
    ]),
    save: jest.fn(async () => undefined),
  };
  const handler = new ContractMemberLeaveCommandHandler(
    contracts as unknown as ContractRepository,
    members as unknown as ContractMemberRepository,
    deps.unitOfWork,
    deps.outbox as unknown as OutboxRepository,
  );
  const command = new ContractMemberLeaveCommand(
    leaving.tenantId!,
    contract.id,
    contract.landlordId,
    new Date('2026-12-15'),
  );
  return { ...deps, contract, leaving, remaining, members, handler, command };
}

describe('ContractMemberLeaveCommandHandler notification (P12-08)', () => {
  it('records a future leave and immediately notifies only other linked members in the same transaction', async () => {
    const s = setup();
    await s.handler.execute(s.command);
    expect(s.members.save).toHaveBeenCalledWith(s.leaving, s.context);
    expect(s.members.findActiveByContract).toHaveBeenCalledWith(
      s.contract.id,
      s.context,
    );
    const [messages, context] = s.outbox.append.mock.calls[0];
    expect(context).toBe(s.context);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual(
      expect.objectContaining({ eventType: 'contract_member.left' }),
    );
    expect(messages[1]).toEqual(
      expect.objectContaining({
        eventType: 'notification.requested',
        payload: {
          sourceService: 'tenancy',
          recipientUserIds: [s.remaining.tenantId],
          notification: {
            type: 'system',
            title: 'CONTRACT_MEMBER_LEFT_TITLE',
            body: 'CONTRACT_MEMBER_LEFT_BODY',
            data: {
              messageKey: 'contract.member_left',
              contractId: s.contract.id,
              contractCode: `HD-${s.contract.id.slice(0, 6)}`,
              memberName: 'Tenant',
              leftOn: '2026-12-15',
            },
          },
        },
      }),
    );
  });

  it('omits notification.requested when no other linked member remains', async () => {
    const s = setup();
    s.members.findActiveByContract.mockResolvedValue([s.leaving]);
    await s.handler.execute(s.command);
    const [messages] = s.outbox.append.mock.calls[0];
    expect(messages).toHaveLength(1);
    expect(messages[0].eventType).toBe('contract_member.left');
  });
});
