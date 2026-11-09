import { Inject, Injectable } from '@nestjs/common';
import { ContractEntity } from 'modules/contract/domain/entities/contract.entity';
import { METER_READING_DI_TOKEN } from 'modules/meter-reading/meter-reading.di-token';
import { MeterReadingRepository } from 'modules/meter-reading/domain/repositories/meter-reading.repository';
import { RATE_POLICY_DI_TOKEN } from 'modules/rate-policy/rate-policy.di-token';
import { RatePolicyRepository } from 'modules/rate-policy/domain/repositories/rate-policy.repository';
import { ROOM_DI_TOKEN } from 'modules/room/room.di-token';
import { RoomRepository } from 'modules/room/domain/repositories/room.repository';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { INVOICE_DI_TOKEN } from '../../invoice.di-token';
import { ContractHeadCountPort } from '../ports/contract-head-count.port';
import { InvoiceCalculatorService } from '../../domain/services/invoice-calculator.service';
import { InvoiceCalculatorResult } from '../../domain/services/invoice-calculator.types';

@Injectable()
export class InvoiceCalculationLoaderService {
  constructor(
    @Inject(ROOM_DI_TOKEN.REPOSITORY) private readonly rooms: RoomRepository,
    @Inject(METER_READING_DI_TOKEN.REPOSITORY)
    private readonly readings: MeterReadingRepository,
    @Inject(RATE_POLICY_DI_TOKEN.REPOSITORY)
    private readonly policies: RatePolicyRepository,
    @Inject(INVOICE_DI_TOKEN.HEAD_COUNT)
    private readonly headCounts: ContractHeadCountPort,
    private readonly calculator: InvoiceCalculatorService,
  ) {}

  async calculate(
    contract: ContractEntity,
    buildingId: Uuid,
    period: string,
    start: string,
    end: string,
    context: TransactionContext,
  ): Promise<InvoiceCalculatorResult> {
    const room = await this.rooms.findById(contract.roomId, context);
    if (!room || room.buildingId !== buildingId)
      throw new ValidationException('Contract room is unavailable');

    const readings = await this.readings.findByRoomAndPeriod(
      room.id,
      period,
      context,
    );
    const roomPolicy = await this.policies.findByRoom(room.id, context);
    const buildingPolicy = await this.policies.findByBuilding(
      buildingId,
      context,
    );
    const headCount = await this.headCounts.countActiveMembers(
      contract.id,
      start,
      end,
      context,
    );
    const electricity = readings.find(
      (reading) => reading.type === 'electricity',
    );
    const water = readings.find((reading) => reading.type === 'water');
    return this.calculator.calculate({
      period,
      contract: {
        startDate: contract.startDate,
        endDate: contract.endDate,
        rentPrice: String(contract.rentPrice),
        vehicleCount: contract.vehicleCount,
      },
      room: { area: room.area === null ? null : String(room.area) },
      headCount,
      roomPolicy,
      buildingPolicy,
      readings: {
        electricity: electricity
          ? { consumption: electricity.consumption }
          : null,
        water: water ? { consumption: water.consumption } : null,
      },
    });
  }
}
