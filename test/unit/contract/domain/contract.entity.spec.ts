import { ContractEntity } from 'modules/contract/domain/entities/contract.entity';
import { ContractStatus } from 'modules/contract/domain/enums/contract-status.enum';
import { ContractNotReadyException } from 'modules/contract/domain/exceptions/contract-not-ready.exception';
import { ContractNotDraftException } from 'modules/contract/domain/exceptions/contract-not-draft.exception';
import { TenantPhone } from 'modules/contract/domain/value-objects/tenant-phone.vo';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

function createContract() {
  return ContractEntity.create({
    landlordId: generateUuid(),
    roomId: generateUuid(),
    tenantId: generateUuid(),
    tenantName: 'Tenant One',
    tenantPhone: '0912345678',
    depositAmount: 5_000_000,
    rentPrice: 3_000_000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    vehicleCount: 1,
  });
}

describe('TenantPhone', () => {
  it('compares national and international Vietnam phone formats canonically', () => {
    expect(
      TenantPhone.create('0912345678').equals(
        TenantPhone.create('+84912345678'),
      ),
    ).toBe(true);
  });

  it('rejects unsupported phone strings', () => {
    expect(() => TenantPhone.create('091 234 5678')).toThrow(
      ValidationException,
    );
  });
});

describe('ContractEntity', () => {
  it('activates a ready contract and records its signed media', () => {
    const contract = createContract();
    const signedMediaId = generateUuid();
    const activatedAt = new Date('2026-01-01T00:00:00.000Z');

    contract.activate([signedMediaId], activatedAt);

    expect(contract.status).toBe(ContractStatus.ACTIVE);
    expect(contract.signedContractMediaIds).toEqual([signedMediaId]);
    expect(contract.activatedAt).toEqual(activatedAt);
    expect(contract.pullDomainEvents()).toEqual([
      expect.objectContaining({ eventType: 'contract.created' }),
      expect.objectContaining({ eventType: 'contract.activated' }),
    ]);
  });

  it('requires at least one unique valid signed document before activation', () => {
    const contract = createContract();

    expect(() => contract.activate([], new Date())).toThrow(
      ContractNotReadyException,
    );
    const mediaId = generateUuid();
    expect(() => contract.activate([mediaId, mediaId], new Date())).toThrow(
      ContractNotReadyException,
    );
  });

  it('allows only draft updates before activation', () => {
    const contract = createContract();
    contract.updateDraft({ description: 'Lease terms' });
    expect(contract.description).toBe('Lease terms');
    contract.activate([generateUuid()], new Date());

    expect(() => contract.updateDraft({ description: 'Changed' })).toThrow(
      ContractNotDraftException,
    );
  });

  it('links an unclaimed tenant only when the supplied phone matches', () => {
    const contract = ContractEntity.create({
      landlordId: generateUuid(),
      roomId: generateUuid(),
      tenantId: null,
      tenantName: 'Tenant One',
      tenantPhone: '+84912345678',
      depositAmount: 0,
      rentPrice: 3_000_000,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      vehicleCount: null,
    });

    expect(
      contract.linkTenant(generateUuid(), TenantPhone.create('0912345678')),
    ).toBe(true);
    expect(contract.tenantId).not.toBeNull();
    expect(
      contract.linkTenant(generateUuid(), TenantPhone.create('0912345678')),
    ).toBe(false);
  });
});
