import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { BuildingEntity } from '../../domain/entities/building.entity';
import { BuildingRepository } from '../../domain/repositories/building.repository';
import { BuildingTypeormEntity } from './building.typeorm-entity';
import { BuildingMapper } from './mappers/building.mapper';

@Injectable()
export class TypeOrmBuildingRepository implements BuildingRepository {
  constructor(
    @InjectRepository(BuildingTypeormEntity)
    private readonly repository: Repository<BuildingTypeormEntity>,
  ) {}

  async save(
    building: BuildingEntity,
    context?: TransactionContext,
  ): Promise<void> {
    await withTransaction(this.repository, context).save(
      BuildingMapper.toPersistence(building),
    );
  }

  async findById(
    id: Uuid,
    context?: TransactionContext,
  ): Promise<BuildingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
    });
    return raw ? BuildingMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<BuildingEntity | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? BuildingMapper.toDomain(raw) : null;
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(id, {
      isDeleted: true,
    });
  }
}
