import { InvoiceGenerateCommand } from 'modules/invoice/application/commands/invoice-generate/invoice-generate.command';
import { InvoiceGenerateCommandHandler } from 'modules/invoice/application/commands/invoice-generate/invoice-generate.command.handler';
import {
  InvoiceGenerateOutcomeKind,
  InvoiceGenerateResult,
} from 'modules/invoice/application/commands/invoice-generate/invoice-generate.result';
import { InvoiceGenerationService } from 'modules/invoice/application/services/invoice-generation.service';
import { InvoiceBlockReason } from 'modules/invoice/domain/enums/invoice-block-reason.enum';
import { BuildingNotOwnedException } from 'modules/building/domain/exceptions/building-not-owned.exception';
import { InvoiceBuildingNotFoundException } from 'modules/invoice/domain/exceptions/invoice-building-not-found.exception';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { ReadingPeriod } from 'modules/meter-reading/domain/value-objects/reading-period.vo';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('InvoiceGenerateCommandHandler', () => {
  it('collects generated, recalculated and blocked outcomes for active contracts in the requested period', async () => {
    const landlordId = generateUuid();
    const buildingId = generateUuid();
    const contractIds = [
      generateUuid(),
      generateUuid(),
      generateUuid(),
      generateUuid(),
    ];
    const buildingRepository = {
      findById: jest.fn(async () => ({ landlordId })),
    } as unknown as BuildingRepository;
    const contractRepository = {
      findActiveInBuildingPeriod: jest.fn(async () =>
        contractIds.map((id) => ({ id })),
      ),
    } as unknown as ContractRepository;
    const generated = {
      invoiceId: generateUuid(),
      code: 'INV-001',
      contractId: contractIds[0],
      roomId: generateUuid(),
      totalAmount: '1500.00',
    };
    const recalculated = {
      ...generated,
      invoiceId: generateUuid(),
      code: 'INV-002',
      contractId: contractIds[1],
    };
    const blocked = {
      contractId: contractIds[2],
      roomId: generateUuid(),
      reasonCode: InvoiceBlockReason.READING_MISSING,
    };
    const generation = {
      generate: jest
        .fn()
        .mockResolvedValueOnce({
          kind: InvoiceGenerateOutcomeKind.GENERATED,
          item: generated,
        })
        .mockResolvedValueOnce({
          kind: InvoiceGenerateOutcomeKind.RECALCULATED,
          item: recalculated,
        })
        .mockResolvedValueOnce({
          kind: InvoiceGenerateOutcomeKind.BLOCKED,
          item: blocked,
        })
        .mockResolvedValueOnce(null),
    } as unknown as InvoiceGenerationService;
    const handler = new InvoiceGenerateCommandHandler(
      buildingRepository,
      contractRepository,
      generation,
    );
    const period = ReadingPeriod.create('2026-11');

    const result = await handler.execute(
      new InvoiceGenerateCommand(landlordId, buildingId, period),
    );

    expect(contractRepository.findActiveInBuildingPeriod).toHaveBeenCalledWith(
      buildingId,
      '2026-11-01',
      '2026-11-30',
    );
    expect(generation.generate).toHaveBeenCalledTimes(4);
    expect(result).toEqual<InvoiceGenerateResult>({
      buildingId,
      period: '2026-11',
      generated: [generated],
      recalculated: [recalculated],
      blocked: [blocked],
    });
  });

  it('rejects unknown or foreign buildings before looking up contracts', async () => {
    const landlordId = generateUuid();
    const buildingId = generateUuid();
    const contracts: ContractRepository = {
      findActiveInBuildingPeriod: jest.fn(async () => []),
    } as unknown as ContractRepository;
    const generation = {
      generate: jest.fn(),
    } as unknown as InvoiceGenerationService;

    const missingBuilding = new InvoiceGenerateCommandHandler(
      { findById: jest.fn(async () => null) } as unknown as BuildingRepository,
      contracts,
      generation,
    );
    await expect(
      missingBuilding.execute(
        new InvoiceGenerateCommand(
          landlordId,
          buildingId,
          ReadingPeriod.create('2026-11'),
        ),
      ),
    ).rejects.toThrow(InvoiceBuildingNotFoundException);

    const foreignBuilding = new InvoiceGenerateCommandHandler(
      {
        findById: jest.fn(async () => ({ landlordId: generateUuid() })),
      } as unknown as BuildingRepository,
      contracts,
      generation,
    );
    await expect(
      foreignBuilding.execute(
        new InvoiceGenerateCommand(
          landlordId,
          buildingId,
          ReadingPeriod.create('2026-11'),
        ),
      ),
    ).rejects.toThrow(BuildingNotOwnedException);
    expect(contracts.findActiveInBuildingPeriod).not.toHaveBeenCalled();
    expect(generation.generate).not.toHaveBeenCalled();
  });
});
