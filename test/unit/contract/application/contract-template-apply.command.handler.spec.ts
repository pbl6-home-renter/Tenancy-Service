import { ContractTemplateApplyCommand } from 'modules/contract/application/commands/contract-template-apply/contract-template-apply.command';
import { ContractTemplateApplyCommandHandler } from 'modules/contract/application/commands/contract-template-apply/contract-template-apply.command.handler';
import { ContractEntity } from 'modules/contract/domain/entities/contract.entity';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ContractTemplateRepository } from 'modules/contract/domain/repositories/contract-template.repository';
import { OutboxRepository } from 'modules/outbox/domain/repositories/outbox.repository';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('ContractTemplateApplyCommandHandler', () => {
  const landlord = generateUuid();
  let contract: ContractEntity;
  let contracts: { findByIdForUpdate: jest.Mock; save: jest.Mock };
  let templates: { findByKey: jest.Mock };
  let outbox: { append: jest.Mock };
  let handler: ContractTemplateApplyCommandHandler;
  const context: TransactionContext = { kind: 'transaction' };

  beforeEach(() => {
    contract = ContractEntity.create({
      landlordId: landlord,
      roomId: generateUuid(),
      tenantId: null,
      tenantName: 'Tenant',
      tenantPhone: '0912345678',
      depositAmount: 0,
      rentPrice: 1,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      vehicleCount: null,
    });
    contract.pullDomainEvents();
    contracts = {
      findByIdForUpdate: jest.fn().mockResolvedValue(contract),
      save: jest.fn(),
    };
    templates = {
      findByKey: jest
        .fn()
        .mockResolvedValue({
          templateKey: 'standard',
          isActive: true,
          isDeleted: false,
        }),
    };
    outbox = { append: jest.fn() };
    const unitOfWork: IUnitOfWork = { run: (work) => work(context) };
    handler = new ContractTemplateApplyCommandHandler(
      contracts as unknown as ContractRepository,
      templates as unknown as ContractTemplateRepository,
      unitOfWork,
      outbox as unknown as OutboxRepository,
    );
  });

  it('saves the template and outbox event in the same transaction', async () => {
    const result = await handler.execute(
      new ContractTemplateApplyCommand(contract.id, landlord, 'standard'),
    );
    expect(result.templateKey).toBe('standard');
    expect(contracts.findByIdForUpdate).toHaveBeenCalledWith(
      contract.id,
      context,
    );
    expect(templates.findByKey).toHaveBeenCalledWith('standard', context);
    expect(contracts.save).toHaveBeenCalledWith(contract, context);
    expect(outbox.append).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ eventType: 'contract.updated' }),
      ]),
      context,
    );
  });

  it('rejects another landlord before looking up the template', async () => {
    await expect(
      handler.execute(
        new ContractTemplateApplyCommand(
          contract.id,
          generateUuid(),
          'standard',
        ),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(templates.findByKey).not.toHaveBeenCalled();
  });

  it('rejects a contract that is not draft', async () => {
    contract.activate([generateUuid()], new Date(), generateUuid(), []);
    await expect(
      handler.execute(
        new ContractTemplateApplyCommand(contract.id, landlord, 'standard'),
      ),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONTRACT_NOT_DRAFT' });
    expect(contracts.save).not.toHaveBeenCalled();
  });

  it.each([
    null,
    { isActive: false, isDeleted: false },
    { isActive: true, isDeleted: true },
  ])('rejects a missing, inactive, or deleted template', async (template) => {
    templates.findByKey.mockResolvedValue(template);
    await expect(
      handler.execute(
        new ContractTemplateApplyCommand(contract.id, landlord, 'standard'),
      ),
    ).rejects.toMatchObject({ statusCode: 404, code: 'TEMPLATE_NOT_FOUND' });
    expect(contracts.save).not.toHaveBeenCalled();
  });
});
