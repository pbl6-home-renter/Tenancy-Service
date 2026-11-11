import { ContractMember } from 'modules/contract/domain/entities/contract-member.entity';
import { LeftDateInvalidException } from 'modules/contract/domain/exceptions/left-date-invalid.exception';
import { MemberAlreadyLeftException } from 'modules/contract/domain/exceptions/member-already-left.exception';
import { TenantPhone } from 'modules/contract/domain/value-objects/tenant-phone.vo';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function createUnlinkedMember() {
  return ContractMember.add({
    contractId: generateUuid(),
    tenantId: null,
    tenantName: 'Tenant One',
    tenantPhone: '0912345678',
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
  });
}

describe('ContractMember', () => {
  it('links an unclaimed member only when the supplied phone matches', () => {
    const member = createUnlinkedMember();
    const tenantId = generateUuid();

    expect(
      member.linkTenant(tenantId, TenantPhone.create('+84912345678')),
    ).toBe(true);
    expect(member.tenantId).toBe(tenantId);
    expect(member.pullDomainEvents().map((event) => event.eventType)).toEqual([
      'contract_member.added',
      'contract_member.linked',
    ]);
    expect(
      member.linkTenant(generateUuid(), TenantPhone.create('0912345678')),
    ).toBe(false);
  });

  it('marks departure at the start of the requested date and rejects earlier or repeated departure', () => {
    const member = createUnlinkedMember();

    expect(() => member.leave(new Date('2025-12-31T12:00:00.000Z'))).toThrow(
      LeftDateInvalidException,
    );
    member.leave(new Date('2026-05-10T15:00:00.000Z'));

    expect(member.leftAt).toEqual(new Date('2026-05-10T00:00:00.000Z'));
    expect(member.status).toBe('left');
    expect(() => member.leave(new Date('2026-05-11T00:00:00.000Z'))).toThrow(
      MemberAlreadyLeftException,
    );
  });
});
