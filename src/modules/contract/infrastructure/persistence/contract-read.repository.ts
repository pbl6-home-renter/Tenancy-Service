import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomTypeormEntity } from 'modules/room/infrastructure/persistence/room.typeorm-entity';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { applySortingToQueryBuilder } from 'shared/infrastructure/database/pagination/sort.helper';
import {
  ContractListResult,
  ContractReadRepository,
} from '../../domain/repositories/contract-read.repository';
import { ContractListFilter } from '../../domain/repositories/contract.repository';
import { ContractTypeormEntity } from './contract.typeorm-entity';

type ContractListRaw = Omit<
  ContractListResult,
  'rentPrice' | 'depositAmount'
> & {
  rentPrice: string | number;
  depositAmount: string | number;
};

@Injectable()
export class TypeOrmContractReadRepository implements ContractReadRepository {
  constructor(
    @InjectRepository(ContractTypeormEntity)
    private readonly repository: Repository<ContractTypeormEntity>,
  ) {}

  async findPageByLandlord(
    landlordId: Uuid,
    options: OffsetPageQuery<ContractListFilter>,
  ): Promise<PaginatedResult<ContractListResult>> {
    const query = this.repository
      .createQueryBuilder('contract')
      .innerJoin(RoomTypeormEntity, 'room', 'room.id = contract.roomId')
      .select('contract.id', 'id')
      .addSelect('contract.roomId', 'roomId')
      .addSelect('room.name', 'roomName')
      .addSelect('contract.tenantName', 'tenantName')
      .addSelect('contract.tenantPhone', 'tenantPhone')
      .addSelect('contract.status', 'status')
      .addSelect('contract.rentPrice', 'rentPrice')
      .addSelect('contract.depositAmount', 'depositAmount')
      .addSelect('contract.startDate', 'startDate')
      .addSelect('contract.endDate', 'endDate')
      .where('contract.landlordId = :landlordId', { landlordId })
      .andWhere('contract.isDeleted = false');

    if (options.filter?.roomId) {
      query.andWhere('contract.roomId = :roomId', {
        roomId: options.filter.roomId,
      });
    }
    if (options.filter?.buildingId) {
      query.andWhere('room.buildingId = :buildingId', {
        buildingId: options.filter.buildingId,
      });
    }
    if (options.filter?.status) {
      query.andWhere('contract.status = :status', {
        status: options.filter.status,
      });
    }
    if (options.filter?.tenantId) {
      query.andWhere('contract.tenantId = :tenantId', {
        tenantId: options.filter.tenantId,
      });
    }
    applySortingToQueryBuilder(query, options, {
      whitelist: ['createdAt'],
      defaultSort: 'createdAt',
      defaultOrder: 'desc',
      alias: 'contract',
    });

    const pageNo = options.pageNo > 0 ? options.pageNo : 1;
    const pageSize = options.pageSize > 0 ? options.pageSize : 20;
    const totalItems = await query.clone().getCount();
    const rows = await query
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<ContractListRaw>();
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      data: rows.map((row) => ({
        ...row,
        rentPrice: Number(row.rentPrice),
        depositAmount: Number(row.depositAmount),
      })),
      pagination: {
        type: 'offset',
        pageNo,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: pageNo < totalPages,
        hasPreviousPage: pageNo > 1,
      },
    };
  }
}
