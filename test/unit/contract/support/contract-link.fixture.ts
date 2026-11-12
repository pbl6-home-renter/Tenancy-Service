import { ContractEntity } from 'modules/contract/domain/entities/contract.entity';
import { ContractMember } from 'modules/contract/domain/entities/contract-member.entity';
import { ContractStatus } from 'modules/contract/domain/enums/contract-status.enum';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';

export function createContract(tenantId: Uuid | null = null) {
  return ContractEntity.reconstitute({
    id: generateUuid(),
    landlordId: generateUuid(),
    roomId: generateUuid(),
    tenantId,
    tenantName: 'Tenant',
    tenantPhone: '0912345678',
    depositAmount: 0,
    rentPrice: 3000000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    vehicleCount: 0,
    status: ContractStatus.ACTIVE,
    description: null,
    activatedAt: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    isDeleted: false,
  });
}

export function createMember(contractId: Uuid, tenantId: Uuid | null = null) {
  return ContractMember.reconstitute({
    id: generateUuid(),
    contractId,
    tenantId,
    tenantName: 'Tenant',
    tenantPhone: '0912345678',
    joinedAt: new Date('2026-01-01'),
    leftAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    isDeleted: false,
  });
}

export function createLinkDependencies() {
  const context: TransactionContext = { kind: 'transaction' };
  const unitOfWork: IUnitOfWork = {
    run: jest.fn(async (work) => work(context)),
  };
  const projection = {
    lockPhone: jest.fn(async () => undefined),
    upsert: jest.fn(async () => undefined),
    delete: jest.fn(async () => undefined),
    findTenantIdByPhone: jest.fn<Promise<Uuid | null>, unknown[]>(
      async () => null,
    ),
  };
  const outbox = { append: jest.fn(async () => undefined) };
  return { context, unitOfWork, projection, outbox };
}
