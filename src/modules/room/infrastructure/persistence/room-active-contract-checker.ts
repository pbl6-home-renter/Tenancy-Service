import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { ContractStatus } from 'modules/contract/domain/enums/contract-status.enum';
import { ContractTypeormEntity } from 'modules/contract/infrastructure/persistence/contract.entity';
import { RoomActiveContractCheckerPort } from '../../application/ports/room-active-contract-checker.port';

/**
 * Reads the contracts table directly (same service database) instead of
 * importing ContractModule, which already imports RoomModule.
 */
@Injectable()
export class TypeOrmRoomActiveContractChecker implements RoomActiveContractCheckerPort {
  constructor(
    @InjectRepository(ContractTypeormEntity)
    private readonly repository: Repository<ContractTypeormEntity>,
  ) {}

  hasActiveContract(
    roomId: Uuid,
    context?: TransactionContext,
  ): Promise<boolean> {
    return withTransaction(this.repository, context).existsBy({
      roomId,
      status: ContractStatus.ACTIVE,
    });
  }
}
