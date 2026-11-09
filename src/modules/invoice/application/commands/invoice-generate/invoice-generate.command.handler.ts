import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BUILDING_DI_TOKEN } from 'modules/building/building.di-token';
import { BuildingNotOwnedException } from 'modules/building/domain/exceptions/building-not-owned.exception';
import { BuildingRepository } from 'modules/building/domain/repositories/building.repository';
import { CONTRACT_DI_TOKEN } from 'modules/contract/contract.di-token';
import { ContractRepository } from 'modules/contract/domain/repositories/contract.repository';
import { InvoiceBuildingNotFoundException } from '../../../domain/exceptions/invoice-building-not-found.exception';
import { InvoiceGenerationService } from '../../services/invoice-generation.service';
import { InvoiceGenerateCommand } from './invoice-generate.command';
import {
  InvoiceGenerateOutcomeKind,
  InvoiceGenerateResult,
} from './invoice-generate.result';

@CommandHandler(InvoiceGenerateCommand)
export class InvoiceGenerateCommandHandler implements ICommandHandler<
  InvoiceGenerateCommand,
  InvoiceGenerateResult
> {
  constructor(
    @Inject(BUILDING_DI_TOKEN.REPOSITORY)
    private readonly buildings: BuildingRepository,
    @Inject(CONTRACT_DI_TOKEN.REPOSITORY)
    private readonly contracts: ContractRepository,
    private readonly generation: InvoiceGenerationService,
  ) {}

  async execute(
    command: InvoiceGenerateCommand,
  ): Promise<InvoiceGenerateResult> {
    const building = await this.buildings.findById(command.buildingId);
    if (!building)
      throw new InvoiceBuildingNotFoundException(command.buildingId);
    if (building.landlordId !== command.landlordId)
      throw new BuildingNotOwnedException(
        command.buildingId,
        command.landlordId,
      );

    const { start, end } = command.period.bounds();
    const contracts = await this.contracts.findActiveInBuildingPeriod(
      command.buildingId,
      start,
      end,
    );
    const result: InvoiceGenerateResult = {
      buildingId: command.buildingId,
      period: command.period.value,
      generated: [],
      recalculated: [],
      blocked: [],
    };
    for (const contract of contracts) {
      const outcome = await this.generation.generate(contract.id, command);
      if (!outcome) continue;
      switch (outcome.kind) {
        case InvoiceGenerateOutcomeKind.GENERATED:
          result.generated.push(outcome.item);
          break;
        case InvoiceGenerateOutcomeKind.RECALCULATED:
          result.recalculated.push(outcome.item);
          break;
        case InvoiceGenerateOutcomeKind.BLOCKED:
          result.blocked.push(outcome.item);
          break;
      }
    }
    return result;
  }
}
