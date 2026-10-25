import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { withTransaction } from 'shared/infrastructure/database/transaction/typeorm-transaction-context';
import { Room } from '../../domain/entities/room.entity';
import { RoomRepository } from '../../domain/repositories/room.repository';
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

  async findById(id: Uuid): Promise<Room | null> {
    const raw = await this.repository.findOne({
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
  ): Promise<boolean> {
    const query = this.repository
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
