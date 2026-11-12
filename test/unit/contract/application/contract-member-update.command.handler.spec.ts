import { ContractMemberUpdateCommand } from 'modules/contract/application/commands/contract-member-update/contract-member-update.command';
import { ContractMemberUpdateCommandHandler } from 'modules/contract/application/commands/contract-member-update/contract-member-update.command.handler';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractMemberRepository } from 'modules/contract/domain/repositories/contract-member.repository';
import { MemberAlreadyExistsException } from 'modules/contract/domain/exceptions/member-already-exists.exception';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { TenantPhone } from 'modules/contract/domain/value-objects/tenant-phone.vo';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import {
  createContract,
  createMember,
  createLinkDependencies,
} from '../support/contract-link.fixture';

function setup(tenantId: Uuid | null = null) {
  const deps = createLinkDependencies();
  const contract = createContract();
  const member = createMember(contract.id, tenantId);
  const contracts = { findByIdForUpdate: jest.fn(async () => contract) };
  const members = {
    findByTenantAndContractForUpdate: jest.fn(async () => null),
    findByIdForUpdate: jest.fn(async () => member),
    existsActiveDuplicate: jest.fn(async () => false),
    save: jest.fn(async () => undefined),
  };
  const handler = new ContractMemberUpdateCommandHandler(
    deps.projection,
    contracts as unknown as ContractRepository,
    members as unknown as ContractMemberRepository,
    deps.unitOfWork,
    deps.outbox as unknown as OutboxRepository,
  );
  const command = new ContractMemberUpdateCommand(
    member.id,
    contract.id,
    contract.landlordId,
    TenantPhone.create('+84987654321'),
  );
  return { ...deps, contract, member, members, handler, command };
}

describe('ContractMemberUpdateCommandHandler tenant linking (P9-02)', () => {
  it('links an unclaimed member using the new phone and appends linked in the same transaction', async () => {
    const s = setup();
    const tenantId = generateUuid();
    s.projection.findTenantIdByPhone.mockResolvedValue(tenantId);
    const member = await s.handler.execute(s.command);
    expect(member.tenantId).toBe(tenantId);
    expect(member.tenantPhone?.normalizedValue).toBe('0987654321');
    expect(s.projection.lockPhone).toHaveBeenCalledWith(
      s.command.tenantPhone,
      s.context,
    );
    expect(s.projection.findTenantIdByPhone).toHaveBeenCalledWith(
      s.command.tenantPhone,
      s.context,
    );
    expect(s.members.save).toHaveBeenCalledWith(member, s.context);
    expect(s.outbox.append).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          eventType: 'contract_member.linked',
          payload: {
            contractId: s.contract.id,
            contractMemberId: member.id,
            tenantUserId: tenantId,
            joinedAt: '2026-01-01',
          },
        }),
      ],
      s.context,
    );
  });

  it('keeps the member unlinked when the new phone has no account', async () => {
    const s = setup();
    const member = await s.handler.execute(s.command);
    expect(member.tenantId).toBeNull();
    expect(s.members.save).toHaveBeenCalledWith(member, s.context);
    expect(s.outbox.append).toHaveBeenCalledWith([], s.context);
  });

  it('does not transfer an existing link when the phone changes to another account', async () => {
    const tenantId = generateUuid();
    const s = setup(tenantId);
    s.projection.findTenantIdByPhone.mockResolvedValue(generateUuid());
    const member = await s.handler.execute(s.command);
    expect(member.tenantId).toBe(tenantId);
    expect(s.projection.findTenantIdByPhone).not.toHaveBeenCalled();
    expect(s.outbox.append).toHaveBeenCalledWith([], s.context);
  });

  it('does not publish another linked event when the command is repeated', async () => {
    const s = setup();
    s.projection.findTenantIdByPhone.mockResolvedValue(generateUuid());
    await s.handler.execute(s.command);
    s.outbox.append.mockClear();
    await s.handler.execute(s.command);
    expect(s.projection.findTenantIdByPhone).toHaveBeenCalledTimes(1);
    expect(s.outbox.append).toHaveBeenCalledWith([], s.context);
  });

  it('rejects a duplicate before saving or publishing a new link', async () => {
    const s = setup();
    s.projection.findTenantIdByPhone.mockResolvedValue(generateUuid());
    s.members.existsActiveDuplicate.mockResolvedValue(true);
    await expect(s.handler.execute(s.command)).rejects.toThrow(
      MemberAlreadyExistsException,
    );
    expect(s.members.save).not.toHaveBeenCalled();
    expect(s.outbox.append).not.toHaveBeenCalled();
  });

  it('propagates an outbox failure so the transaction can roll back', async () => {
    const s = setup();
    const failure = new Error('outbox unavailable');
    s.projection.findTenantIdByPhone.mockResolvedValue(generateUuid());
    s.outbox.append.mockRejectedValue(failure);
    await expect(s.handler.execute(s.command)).rejects.toBe(failure);
  });
});
