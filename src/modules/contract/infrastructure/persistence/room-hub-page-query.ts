import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffsetPageQuery } from 'shared/application/pagination/offset-page-query';
import { PaginatedResult } from 'shared/application/pagination/paginated-result';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { RoomHubPageQueryPort } from '../../application/ports/room-hub-page-query.port';
import { RoomHubListResult } from '../../application/queries/room-hub-list/room-hub-list.result';
import { ContractStatus } from '../../domain/enums/contract-status.enum';
import { applyContractTenantAccess } from './contract-tenant-access.query';
import { ContractTypeormEntity } from './contract.entity';

@Injectable()
export class TypeOrmRoomHubPageQuery implements RoomHubPageQueryPort {
  constructor(
    @InjectRepository(ContractTypeormEntity)
    private readonly repository: Repository<ContractTypeormEntity>,
  ) {}

  async findPage(
    tenantId: Uuid,
    options: OffsetPageQuery,
  ): Promise<PaginatedResult<RoomHubListResult>> {
    const query = this.repository
      .createQueryBuilder('contract')
      .innerJoin(
        'rooms',
        'room',
        'room.id = contract.roomId AND room.is_deleted = false',
      )
      .innerJoin(
        'buildings',
        'building',
        'building.id = room.building_id AND building.is_deleted = false',
      )
      .select('contract.id', 'contractId')
      .addSelect('room.id', 'roomId')
      .addSelect('room.name', 'roomName')
      .addSelect('room.area', 'area')
      .addSelect('building.id', 'buildingId')
      .addSelect('building.name', 'buildingName')
      .addSelect('building.address', 'address')
      .addSelect('building.ward', 'ward')
      .addSelect('building.province', 'province')
      .addSelect('contract.rentPrice', 'rentPrice')
      .addSelect('contract.startDate', 'startDate')
      .addSelect('contract.endDate', 'endDate')
      .where('contract.isDeleted = false')
      .andWhere('contract.status = :status', { status: ContractStatus.ACTIVE });
    applyContractTenantAccess(query, tenantId);
    query
      .orderBy('contract.startDate', 'DESC')
      .addOrderBy('contract.id', 'ASC');
    const { pageNo, pageSize } = options;
    const totalItems = await query.clone().getCount();
    const rows = await query
      .offset((pageNo - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<
        Omit<RoomHubListResult, 'area' | 'rentPrice'> & {
          area: string | number | null;
          rentPrice: string | number;
        }
      >();
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      data: rows.map((row) => ({
        ...row,
        area: row.area === null ? null : Number(row.area),
        rentPrice: Number(row.rentPrice),
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
