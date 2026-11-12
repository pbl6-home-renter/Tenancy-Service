import { ContractMemberAddCommand } from 'modules/contract/application/commands/contract-member-add/contract-member-add.command';
import { ContractMemberAddCommandHandler } from 'modules/contract/application/commands/contract-member-add/contract-member-add.command.handler';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { MemberAlreadyExistsException } from 'modules/contract/domain/exceptions/member-already-exists.exception';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { TenantPhone } from 'modules/contract/domain/value-objects/tenant-phone.vo';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import {
  createContract,
  createLinkDependencies,
} from '../support/contract-link.fixture';

function setup() {
  const deps = createLinkDependencies();
  const contract = createContract();
  const contracts = { findByIdForUpdate: jest.fn(async () => contract) };
  const members = {
    existsActiveDuplicate: jest.fn(async () => false),
    save: jest.fn(async () => undefined),
  };
  const handler = new ContractMemberAddCommandHandler(
    deps.projection,
    contracts as unknown as ContractRepository,
    members as unknown as ContractMemberRepository,
    deps.unitOfWork,
    deps.outbox as unknown as OutboxRepository,
  );
  const command = new ContractMemberAddCommand(contract.landlordId, {
    contractId: contract.id,
    tenantId: null,
    tenantName: 'Tenant',
    tenantPhone: '+84912345678',
    joinedAt: new Date('2026-02-01'),
  });
  return { ...deps, contract, members, handler, command };
}

describe('ContractMemberAddCommandHandler tenant linking (P9-02)', () => {
  it('resolves an existing account by phone and saves the linked member and added event in the same transaction', async () => {
    const s = setup();
    const tenantId = generateUuid();
    s.projection.findTenantIdByPhone.mockResolvedValue(tenantId);
    const member = await s.handler.execute(s.command);
    expect(member.tenantId).toBe(tenantId);
    const [phone, context] = s.projection.findTenantIdByPhone.mock.calls[0];
    expect((phone as TenantPhone).normalizedValue).toBe('0912345678');
    expect(context).toBe(s.context);
    expect(s.projection.lockPhone).toHaveBeenCalledWith(phone, s.context);
    expect(s.members.existsActiveDuplicate).toHaveBeenCalledWith(
      s.contract.id,
      expect.objectContaining({ tenantId }),
      s.context,
    );
    expect(s.members.save).toHaveBeenCalledWith(member, s.context);
    expect(s.outbox.append).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          eventType: 'contract_member.added',
          payload: expect.objectContaining({
            contractId: s.contract.id,
            contractMemberId: member.id,
            tenantUserId: tenantId,
            joinedAt: '2026-02-01',
          }),
        }),
      ],
      s.context,
    );
  });

  it('keeps an unknown phone unlinked and publishes added with a null user ID', async () => {
    const s = setup();
    const member = await s.handler.execute(s.command);
    expect(member.tenantId).toBeNull();
    expect(s.outbox.append).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          payload: expect.objectContaining({ tenantUserId: null }),
        }),
      ],
      s.context,
    );
  });

  it('preserves an explicit tenant ID without resolving it to a different account', async () => {
    const s = setup();
    const tenantId = generateUuid();
    const member = await s.handler.execute(
      new ContractMemberAddCommand(s.contract.landlordId, {
        ...s.command.input,
        tenantId,
        tenantPhone: null,
      }),
    );
    expect(member.tenantId).toBe(tenantId);
    expect(s.projection.findTenantIdByPhone).not.toHaveBeenCalled();
    expect(s.projection.lockPhone).not.toHaveBeenCalled();
  });

  it('rejects duplicate membership before saving or publishing', async () => {
    const s = setup();
    s.members.existsActiveDuplicate.mockResolvedValue(true);
    await expect(s.handler.execute(s.command)).rejects.toThrow(
      MemberAlreadyExistsException,
    );
    expect(s.members.save).not.toHaveBeenCalled();
    expect(s.outbox.append).not.toHaveBeenCalled();
  });

  it('propagates an outbox failure to the unit of work', async () => {
    const s = setup();
    const failure = new Error('outbox unavailable');
    s.outbox.append.mockRejectedValue(failure);
    await expect(s.handler.execute(s.command)).rejects.toBe(failure);
    expect(s.members.save).toHaveBeenCalledWith(expect.anything(), s.context);
    expect(s.outbox.append).toHaveBeenCalledWith(expect.anything(), s.context);
  });
});
