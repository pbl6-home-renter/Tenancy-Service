import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { TypeOrmOffsetPaginator } from 'shared/infrastructure/database/pagination/offset.paginator';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Room } from '../../domain/entities/room.entity';
import {
  RoomListFilter,
  RoomRepository,
} from '../../domain/repositories/room.repository';
import { RoomMapper } from './mappers/room.mapper';
import { RoomTypeormEntity } from './room.typeorm-entity';

@Injectable()
export class TypeOrmRoomRepository implements RoomRepository {
  constructor(
    @InjectRepository(RoomTypeormEntity)
    private readonly repository: Repository<RoomTypeormEntity>,
  ) {}

  async save(room: Room, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).save(
      RoomMapper.toPersistence(room),
    );
  }

  async findOwnedPaginated(
    landlordId: Uuid,
    options: OffsetPageQuery<RoomListFilter>,
  ): Promise<PaginatedResult<Room>> {
    const query = this.repository
      .createQueryBuilder('room')
      .where('room.landlordId = :landlordId', { landlordId })
      .andWhere('room.isDeleted = false');

    if (options.filter?.buildingId) {
      query.andWhere('room.buildingId = :buildingId', {
        buildingId: options.filter.buildingId,
      });
    }
    if (options.filter?.status) {
      query.andWhere('room.status = :status', {
        status: options.filter.status,
      });
    }

    return TypeOrmOffsetPaginator.of(query, options)
      .withSort({
        whitelist: [
          'name',
          'rentPrice',
          'area',
          'floorNumber',
          'status',
          'createdAt',
          'updatedAt',
        ],
        defaultSort: 'rentPrice',
        defaultOrder: 'asc',
        alias: 'room',
      })
      .paginate(RoomMapper.toDomain);
  }

  async findById(id: Uuid, context?: TransactionContext): Promise<Room | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
    });
    return raw ? RoomMapper.toDomain(raw) : null;
  }

  async findByIdForUpdate(
    id: Uuid,
    context: TransactionContext,
  ): Promise<Room | null> {
    const raw = await withTransaction(this.repository, context).findOne({
      where: { id, isDeleted: false },
      lock: { mode: 'pessimistic_write' },
    });
    return raw ? RoomMapper.toDomain(raw) : null;
  }

  async existsByBuildingAndName(
    buildingId: Uuid,
    name: string,
    exceptRoomId?: Uuid,
    context?: TransactionContext,
  ): Promise<boolean> {
    const query = withTransaction(this.repository, context)
      .createQueryBuilder('room')
      .where('room.buildingId = :buildingId', { buildingId })
      .andWhere('room.name = :name', { name })
      .andWhere('room.isDeleted = false');

    if (exceptRoomId) {
      query.andWhere('room.id != :exceptRoomId', { exceptRoomId });
    }

    return query.getExists();
  }

  async delete(id: Uuid, context?: TransactionContext): Promise<void> {
    await withTransaction(this.repository, context).update(
      { id, isDeleted: false },
      { isDeleted: true },
    );
  }
}
